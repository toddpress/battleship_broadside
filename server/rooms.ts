import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { validFleet } from '../shared/protocol.ts';
import type { Command, Placement, Seat, Shot, Snapshot } from '../shared/protocol.ts';
import { other, resolveShot } from './rules.ts';

const ABSENT = 30_000;
const EXPIRED = 90_000;
const RETENTION = 300_000;
type Pair<T> = [T, T];
type Receipt = { payload: string; shot: Shot | null };
type Player = { token: string; seen: number; present: boolean; chatTimes: number[] };
type Room = {
  id: string; topic: string; revision: number; phase: Snapshot['phase'];
  players: [Player, Player | null]; matchId: string | null; matchRevision: number; starter: Seat;
  turn: Seat | null; winner: Seat | null; reason: Snapshot['reason']; finishedAt: number | null;
  fleets: Pair<Placement[] | null>; shots: Shot[]; votes: Pair<boolean>; receipts: Pair<Map<string, Receipt>>;
  chat: Snapshot['chat']; sequence: number;
};
export class Rejection extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
type Options = {
  now?: () => number; wallTime?: () => string; id?: () => string;
  publish?: (topic: string, revision: number) => void;
  releaseTopic?: (topic: string) => void;
  onPublishError?: (error: unknown) => void;
};

export class Rooms {
  private readonly rooms = new Map<string, Room>();
  private readonly sessions = new Map<string, { room: Room; seat: Seat }>();
  private readonly now: () => number;
  private readonly wallTime: () => string;
  private readonly id: () => string;
  private readonly publish: NonNullable<Options['publish']>;
  private readonly releaseTopic: NonNullable<Options['releaseTopic']>;
  private readonly onPublishError: NonNullable<Options['onPublishError']>;

  constructor(options: Options = {}) {
    this.now = options.now ?? (() => performance.now());
    this.wallTime = options.wallTime ?? (() => new Date().toISOString());
    this.id = options.id ?? randomUUID;
    this.publish = options.publish ?? (() => {});
    this.releaseTopic = options.releaseTopic ?? (() => {});
    this.onPublishError = options.onPublishError ?? (() => {});
  }
  private changed(room: Room) {
    room.revision++;
    try {
      this.publish(room.topic, room.revision);
    } catch (error) {
      this.onPublishError(error);
    }
  }
  private startRound(room: Room, starter: Seat) {
    room.phase = 'placement';
    room.matchId = this.id();
    room.matchRevision = 0;
    room.starter = starter;
    room.turn = null;
    room.winner = null;
    room.reason = null;
    room.finishedAt = null;
    room.fleets = [null, null];
    room.shots = [];
    room.votes = [false, false];
    room.receipts = [new Map(), new Map()];
  }
  private finish(room: Room, winner: Seat, reason: 'fleet-destroyed' | 'forfeit', now: number) {
    room.phase = 'finished';
    room.winner = winner;
    room.turn = null;
    room.reason = reason;
    room.finishedAt = now;
  }
  private close(room: Room) {
    room.phase = 'closed';
    room.reason ??= 'abandoned';
    room.turn = null;
    for (const player of room.players) if (player) this.sessions.delete(player.token);
    this.rooms.delete(room.id);
    this.changed(room);
    try {
      this.releaseTopic(room.topic);
    } catch (error) {
      this.onPublishError(error);
    }
  }
  sweep(now = this.now()) {
    for (const room of this.rooms.values()) {
      if (room.finishedAt !== null && now - room.finishedAt >= RETENTION) {
        this.close(room);
        continue;
      }
      let presenceChanged = false;
      for (const player of room.players) {
        if (player?.present && now - player.seen >= ABSENT) {
          player.present = false;
          presenceChanged = true;
        }
      }
      const expired = room.players.findIndex((player) => player && this.sessions.has(player.token) && now - player.seen >= EXPIRED);
      if (expired !== -1) {
        const seat = expired as Seat;
        const opponent = room.players[other(seat)];
        if (room.phase === 'waiting' || room.phase === 'placement' || (room.phase === 'playing' && !opponent?.present)) {
          this.close(room);
          continue;
        }
        this.sessions.delete(room.players[seat]!.token);
        if (room.phase === 'playing' && opponent?.present) {
          this.finish(room, other(seat), 'forfeit', now);
          room.matchRevision++;
          presenceChanged = true;
        }
      }
      if (presenceChanged) this.changed(room);
    }
  }
  join() {
    const now = this.now();
    this.sweep(now);
    const player = { token: this.id(), seen: now, present: true, chatTimes: [] };
    const waiting = [...this.rooms.values()].find((room) =>
      room.phase === 'waiting' && room.players[0].present && room.players[1] === null);
    if (waiting) {
      waiting.players[1] = player;
      this.sessions.set(player.token, { room: waiting, seat: 1 });
      this.startRound(waiting, 0);
      this.changed(waiting);
      return { token: player.token, state: this.view(waiting, 1) };
    }
    const room: Room = {
      id: this.id(), topic: this.id(), revision: 0, phase: 'waiting', players: [player, null],
      matchId: null, matchRevision: 0, starter: 0, turn: null, winner: null, reason: null,
      finishedAt: null, fleets: [null, null], shots: [], votes: [false, false],
      receipts: [new Map(), new Map()], chat: [], sequence: 0,
    };
    this.rooms.set(room.id, room);
    this.sessions.set(player.token, { room, seat: 0 });
    this.changed(room);
    return { token: player.token, state: this.view(room, 0) };
  }
  private session(token: string, now: number) {
    this.sweep(now);
    const entry = this.sessions.get(token);
    if (!entry) throw new Rejection(401, 'SESSION_EXPIRED');
    const player = entry.room.players[entry.seat]!;
    player.seen = now;
    if (!player.present) {
      player.present = true;
      this.changed(entry.room);
    }
    return { ...entry, player };
  }
  state(token: string) {
    const { room, seat } = this.session(token, this.now());
    return this.view(room, seat);
  }
  command(token: string, command: Command) {
    const now = this.now();
    const { room, seat, player } = this.session(token, now);
    const opponent = room.players[other(seat)];
    if (command.roomId !== room.id) throw new Rejection(409, 'ROOM_CHANGED');
    let shot: Shot | null = null;
    if (command.kind === 'ready' || command.kind === 'fire') {
      if (command.matchId !== room.matchId) throw new Rejection(409, 'ROUND_CHANGED');
      const receipts = room.receipts[seat];
      const payload = JSON.stringify(command);
      const receipt = receipts.get(command.id);
      if (receipt) {
        if (receipt.payload !== payload) throw new Rejection(409, 'COMMAND_ID_REUSED');
        return { state: this.view(room, seat), shot: receipt.shot };
      }
      if (room.matchRevision !== command.revision) throw new Rejection(409, 'STALE_REVISION');
      if (!opponent?.present) throw new Rejection(409, 'OPPONENT_AWAY');
      if (command.kind === 'ready') {
        if (room.phase !== 'placement' || room.fleets[seat]) throw new Rejection(409, 'READY_CLOSED');
        if (!validFleet(command.fleet)) throw new Rejection(400, 'INVALID_FLEET');
        room.fleets[seat] = command.fleet.map((ship) => ({ ...ship }));
        if (room.fleets[0] && room.fleets[1]) {
          room.phase = 'playing';
          room.turn = room.starter;
        }
      } else {
        if (room.phase !== 'playing' || room.turn !== seat) throw new Rejection(409, 'CANNOT_FIRE');
        const result = resolveShot(room.fleets[other(seat)]!, room.shots, seat, command);
        if ('error' in result) throw new Rejection(result.error === 'INVALID_COORDINATE' ? 400 : 409, result.error);
        shot = result.shot;
        room.shots.push(shot);
        if (result.won) this.finish(room, seat, 'fleet-destroyed', now);
        else room.turn = other(seat);
      }
      room.matchRevision++;
      receipts.set(command.id, { payload, shot });
      if (receipts.size > 256) receipts.delete(receipts.keys().next().value!);
    } else if (command.kind === 'chat') {
      if (!opponent) throw new Rejection(409, 'CHAT_UNAVAILABLE');
      const text = command.text.trim();
      if (!text || [...text].length > 240) throw new Rejection(400, 'INVALID_MESSAGE');
      player.chatTimes = player.chatTimes.filter((time) => now - time < 10_000);
      if (player.chatTimes.length >= 5) throw new Rejection(429, 'CHAT_RATE_LIMIT');
      player.chatTimes.push(now);
      room.chat.push({ sequence: ++room.sequence, from: seat, text, at: this.wallTime() });
      if (room.chat.length > 50) room.chat.shift();
    } else if (command.kind === 'rematch') {
      if (room.phase !== 'finished' || command.matchId !== room.matchId || !opponent?.present) {
        throw new Rejection(409, 'REMATCH_UNAVAILABLE');
      }
      if (room.votes[seat]) return { state: this.view(room, seat), shot };
      room.votes[seat] = true;
      if (room.votes[other(seat)]) this.startRound(room, other(room.starter));
    } else {
      if (room.phase === 'waiting' || room.phase === 'placement') {
        this.close(room);
        return { state: this.view(room, seat), shot };
      }
      this.sessions.delete(token);
      player.present = false;
      if (room.phase === 'playing') {
        this.finish(room, other(seat), 'forfeit', now);
        room.matchRevision++;
      }
    }
    this.changed(room);
    return { state: this.view(room, seat), shot };
  }
  private view(room: Room, seat: Seat): Snapshot {
    return {
      roomId: room.id, topic: room.topic, roomRevision: room.revision, seat,
      phase: room.phase, matchId: room.matchId, matchRevision: room.matchRevision, turn: room.turn,
      winner: room.winner, reason: room.reason,
      present: [room.players[0].present, room.players[1]?.present ?? false],
      ready: [Boolean(room.fleets[0]), Boolean(room.fleets[1])], votes: [...room.votes],
      fleet: (room.fleets[seat] ?? []).map((ship) => ({ ...ship })),
      shots: room.shots.map((shot) => ({ ...shot, sunk: shot.sunk ? { ...shot.sunk } : null })),
      chat: room.chat.map((message) => ({ ...message })),
    };
  }
}
