import express from 'express';
import type { Request } from 'express';
import type { Command, Placement } from '../shared/protocol.ts';
import { SHIPS } from '../shared/protocol.ts';
import { Rejection, Rooms } from './rooms.ts';

type Input = Record<string, unknown>;
const object = (value: unknown): value is Input => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{1,64}$/i.test(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
function placement(value: unknown): Placement {
  if (object(value) && integer(value.x) && integer(value.y) && typeof value.vertical === 'boolean') {
    const ship = SHIPS.find(({ id }) => id === value.id);
    if (ship) return { id: ship.id, x: value.x, y: value.y, vertical: value.vertical };
  }
  throw new Rejection(400, 'INVALID_FLEET');
}
function parse(value: unknown): Command {
  if (object(value) && identifier(value.id) && identifier(value.roomId)) {
    const { id, roomId, kind } = value;
    const base = { id, roomId };
    if (kind === 'leave') return { ...base, kind };
    if (kind === 'chat' && typeof value.text === 'string') return { ...base, kind, text: value.text };
    if (identifier(value.matchId)) {
      const round = { ...base, matchId: value.matchId };
      if (kind === 'rematch') return { ...round, kind };
      if (integer(value.revision) && value.revision >= 0) {
        const revision = value.revision;
        if (kind === 'fire' && integer(value.x) && integer(value.y)) {
          return { ...round, kind, revision, x: value.x, y: value.y };
        }
        if (kind === 'ready' && Array.isArray(value.fleet) && value.fleet.length === SHIPS.length) {
          return { ...round, kind, revision, fleet: value.fleet.map(placement) };
        }
      }
    }
  }
  throw new Rejection(400, 'INVALID_COMMAND');
}
function bearer(request: Request) {
  const token = request.get('authorization')?.match(/^Bearer ([a-z0-9-]{1,64})$/i)?.[1];
  if (!token) throw new Rejection(401, 'SESSION_EXPIRED');
  return token;
}

export function createApp(rooms: Rooms, options: { origins?: string[]; publicDir?: string } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const api = express.Router();
  const joins = new Map<string, { start: number; count: number }>();
  api.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    const origin = request.get('origin');
    if (request.method === 'POST' && origin && !options.origins?.includes(origin)) {
      next(new Rejection(403, 'ORIGIN_DENIED'));
      return;
    }
    next();
  });
  api.use(express.json({ limit: '12kb' }));
  api.get('/health', (_, response) => response.json({ ok: true }));
  api.post('/sessions', (request, response) => {
    const now = Date.now();
    for (const [key, bucket] of joins) if (now - bucket.start >= 60_000) joins.delete(key);
    const key = request.ip ?? 'unknown';
    const bucket = joins.get(key) ?? { start: now, count: 0 };
    if (bucket.count >= 30) throw new Rejection(429, 'JOIN_RATE_LIMIT');
    bucket.count++;
    joins.set(key, bucket);
    response.status(201).json(rooms.join());
  });
  api.get('/state', (request, response) => response.json(rooms.state(bearer(request))));
  api.post('/commands', (request, response) => response.json(rooms.command(bearer(request), parse(request.body))));
  api.use((_, response) => response.status(404).json({ error: 'NOT_FOUND' }));
  api.use((error: unknown, _request: Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof Rejection) {
      response.status(error.status).json({ error: error.code });
    } else if (object(error) && error.status === 413) {
      response.status(413).json({ error: 'BODY_TOO_LARGE' });
    } else if (object(error) && error.status === 400) {
      response.status(400).json({ error: 'INVALID_JSON' });
    } else {
      console.error('Broadside API error', error);
      response.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });
  app.use('/api/v1', api);
  if (options.publicDir) app.use(express.static(options.publicDir));
  return app;
}
