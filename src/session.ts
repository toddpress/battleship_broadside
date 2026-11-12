import Gun from 'gun/gun';
import type { Command, Shot, Snapshot } from '../shared/protocol.ts';

const storageKey = 'broadside-v2-session';
type Link = 'online' | 'retrying' | 'expired' | 'idle';
type Update = (state: Snapshot | null, link: Link, fresh: boolean) => void;
export class ApiError extends Error {
  constructor(readonly status: number, code: string) { super(code); }
}
async function request<T>(path: string, token = '', body?: object): Promise<T> {
  const response = await fetch('/api/v1/' + path, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(5_000),
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, typeof error.error === 'string' ? error.error : 'LINK_ERROR');
  }
  return response.json();
}

export class Session {
  private token = sessionStorage.getItem(storageKey) ?? '';
  private state: Snapshot | null = null;
  private link: Link = 'idle';
  private generation = 0;
  private flight: Promise<void> | null = null;
  private hintTimer = 0;
  private retry = 0;
  private retryAttempt = 0;
  private poll = 0;
  private topic = '';
  private subscription: ReturnType<ReturnType<typeof Gun>['get']> | null = null;
  private readonly relay = Gun({ peers: [location.origin + '/gun'], localStorage: false, radisk: false, axe: false, WebRTC: false });

  constructor(private readonly update: Update) {}
  start() {
    window.addEventListener('online', this.refresh);
    window.addEventListener('offline', this.offline);
    this.poll = window.setInterval(this.refresh, 10_000);
    if (this.token) void this.refresh();
  }
  private offline = () => {
    if (!this.token) return;
    this.link = 'retrying';
    this.update(this.state, this.link, false);
  };
  private subscribe(topic: string) {
    if (this.topic === topic) return;
    this.subscription?.off();
    this.subscription = null;
    this.topic = topic;
    if (!topic) return;
    this.subscription = this.relay.get('broadside-v2:' + topic).on((value) => {
      const revision = (value as { revision?: unknown } | null)?.revision;
      if (this.topic !== topic || !Number.isSafeInteger(revision) ||
        Number(revision) <= (this.state?.roomRevision ?? 0) || this.hintTimer) return;
      this.hintTimer = window.setTimeout(() => {
        this.hintTimer = 0;
        void this.refresh();
      }, 350);
    });
  }
  private accept(state: Snapshot) {
    const previous = this.state;
    if (previous && (previous.roomId !== state.roomId || previous.roomRevision > state.roomRevision)) return;
    this.state = state;
    this.link = 'online';
    this.subscribe(state.topic);
    this.update(state, 'online', Boolean(previous && previous.matchId === state.matchId));
  }
  async join() {
    const generation = ++this.generation;
    const { token, state } = await request<{ token: string; state: Snapshot }>('sessions', '', {});
    if (generation !== this.generation) return;
    this.token = token;
    sessionStorage.setItem(storageKey, token);
    this.accept(state);
  }
  refresh = () => {
    if (!this.token || this.flight) return this.flight ?? Promise.resolve();
    const generation = this.generation;
    const flight = request<Snapshot>('state', this.token).then((state) => {
      if (generation === this.generation) {
        clearTimeout(this.retry);
        this.retry = 0;
        this.retryAttempt = 0;
        this.accept(state);
      }
    }).catch((error: unknown) => {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && error.status === 401) this.clear('expired');
      else {
        this.offline();
        if (!this.retry) {
          const delay = Math.min(2_000 * 2 ** this.retryAttempt, 8_000);
          this.retryAttempt = Math.min(this.retryAttempt + 1, 2);
          this.retry = window.setTimeout(() => {
            this.retry = 0;
            void this.refresh();
          }, delay);
        }
      }
    }).finally(() => {
      if (this.flight === flight) this.flight = null;
    });
    this.flight = flight;
    return flight;
  };
  async send(command: Command) {
    const generation = this.generation;
    const token = this.token;
    try {
      let result: { state: Snapshot; shot: Shot | null };
      try {
        result = await request<typeof result>('commands', token, command);
      } catch (error) {
        if (error instanceof ApiError || (command.kind !== 'ready' && command.kind !== 'fire')) throw error;
        result = await request<typeof result>('commands', token, command);
      }
      if (generation !== this.generation) return;
      if (command.kind === 'leave') this.clear('idle');
      else this.accept(result.state);
    } catch (error) {
      if (generation !== this.generation) return;
      if (error instanceof ApiError && error.status === 401) this.clear('expired');
      else {
        if (!(error instanceof ApiError)) this.offline();
        if (this.flight) await this.flight;
        await this.refresh();
      }
      throw error;
    }
  }
  private clear(link: Link) {
    this.generation++;
    this.state = null;
    this.token = '';
    this.link = link;
    this.flight = null;
    clearTimeout(this.hintTimer);
    clearTimeout(this.retry);
    this.hintTimer = 0;
    this.retry = 0;
    this.retryAttempt = 0;
    sessionStorage.removeItem(storageKey);
    this.subscribe('');
    this.update(null, link, false);
  }
  dispose() {
    this.generation++;
    clearInterval(this.poll);
    clearTimeout(this.retry);
    clearTimeout(this.hintTimer);
    this.subscribe('');
    window.removeEventListener('online', this.refresh);
    window.removeEventListener('offline', this.offline);
  }
}
