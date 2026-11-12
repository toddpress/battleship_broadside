import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHIPS, cells, randomFleet, validFleet } from '../shared/protocol.ts';
import { Rooms } from '../server/rooms.ts';

const fleet = (offset = 0) => SHIPS.map(({ id }, y) => ({ id, x: 0, y: y + offset, vertical: false }));

function fixture(options = {}) {
  let now = 0;
  let id = 0;
  const rooms = new Rooms({ now: () => now, id: () => 'id-' + ++id, ...options });
  const a = rooms.join();
  const b = rooms.join();
  const send = (seat, action) => {
    const token = seat === 0 ? a.token : b.token;
    const state = rooms.state(token);
    return rooms.command(token, {
      id: 'cmd-' + ++id, roomId: state.roomId, matchId: state.matchId, revision: state.matchRevision, ...action,
    });
  };
  const ready = () => {
    send(0, { kind: 'ready', fleet: fleet() });
    send(1, { kind: 'ready', fleet: fleet(5) });
  };
  return { rooms, a, b, send, ready, time: (time) => { now = time; } };
}

test('seeded placement generates 17 disjoint cells and rejects invalid placements', () => {
  let seed = 7;
  for (let index = 0; index < 256; index++) {
    const placed = randomFleet(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32));
    assert.ok(validFleet(placed));
    assert.equal(placed.flatMap(cells).length, 17);
  }
  const overlap = fleet();
  overlap[1].y = 0;
  assert.equal(validFleet(overlap), false);
  const edge = fleet();
  edge[0].x = 6;
  assert.equal(validFleet(edge), false);
  assert.equal(validFleet(fleet()), true);
});

test('FIFO pairing holds two seats and isolates the next pair', () => {
  const { rooms, a, b } = fixture();
  assert.equal(a.state.phase, 'waiting');
  assert.equal(b.state.phase, 'placement');
  assert.equal(rooms.state(a.token).roomId, b.state.roomId);
  const c = rooms.join();
  assert.equal(c.state.phase, 'waiting');
  const d = rooms.join();
  assert.equal(d.state.roomId, c.state.roomId);
  assert.notEqual(c.state.roomId, a.state.roomId);
});

test('ready commands are revision-checked, retry-safe and preserve private fleets', () => {
  const { rooms, a, b, send } = fixture();
  const command = { id: 'ready-a', kind: 'ready', roomId: b.state.roomId, matchId: b.state.matchId, revision: 0, fleet: fleet() };
  assert.throws(() => send(0, { kind: 'ready', fleet: [] }), { code: 'INVALID_FLEET' });
  rooms.command(a.token, command);
  assert.equal(rooms.command(a.token, command).state.matchRevision, 1);
  assert.throws(() => rooms.command(a.token, { ...command, fleet: fleet(1) }), { code: 'COMMAND_ID_REUSED' });
  assert.throws(() => rooms.command(b.token, { ...command, id: 'ready-b' }), { code: 'STALE_REVISION' });
  assert.deepEqual(rooms.state(b.token).fleet, []);
  send(1, { kind: 'ready', fleet: fleet(5) });
  assert.deepEqual(rooms.state(a.token).fleet, fleet());
  assert.equal(rooms.state(b.token).turn, 0);
});

test('legal shots alternate on hits and misses, reveal only sunk ships, and end at victory', () => {
  const { a, rooms, ready, send } = fixture();
  ready();
  assert.throws(() => send(1, { kind: 'fire', x: 0, y: 0 }), { code: 'CANNOT_FIRE' });
  assert.throws(() => send(0, { kind: 'fire', x: 10, y: 0 }), { code: 'INVALID_COORDINATE' });
  const targets = fleet(5).flatMap(cells);
  for (const [index, target] of targets.entries()) {
    const { shot } = send(0, { kind: 'fire', ...target });
    assert.equal(shot.hit, true);
    assert.deepEqual(Object.keys(shot).sort(), ['by', 'hit', 'id', 'sunk', 'x', 'y']);
    if (index === 0) assert.equal(shot.sunk, null);
    if (index === 4) assert.deepEqual(shot.sunk, fleet(5)[0]);
    if (index < targets.length - 1) {
      assert.equal(send(1, { kind: 'fire', x: index % 10, y: 7 + Math.floor(index / 10) }).shot.hit, false);
      assert.throws(() => send(0, { kind: 'fire', ...target }), { code: 'REPEATED_TARGET' });
    }
  }
  assert.equal(rooms.state(a.token).winner, 0);
  assert.equal(rooms.state(a.token).phase, 'finished');
  assert.throws(() => send(0, { kind: 'fire', x: 9, y: 9 }), { code: 'CANNOT_FIRE' });
});

test('temporary loss pauses play, exact expiry forfeits, and restart clears the session', () => {
  const { rooms, a, b, ready, time, send } = fixture();
  ready();
  time(29_999);
  assert.equal(rooms.state(a.token).present[1], true);
  time(30_000);
  assert.equal(rooms.state(a.token).present[1], false);
  assert.throws(() => send(0, { kind: 'fire', x: 0, y: 5 }), { code: 'OPPONENT_AWAY' });
  time(89_999);
  rooms.state(a.token);
  assert.equal(rooms.state(b.token).seat, 1);
  assert.equal(send(0, { kind: 'fire', x: 0, y: 5 }).shot.hit, true);
  time(179_998);
  rooms.state(a.token);
  time(179_999);
  assert.equal(rooms.state(a.token).reason, 'forfeit');
  assert.throws(() => rooms.state(b.token), { code: 'SESSION_EXPIRED' });
  assert.throws(() => new Rooms().state(a.token), { code: 'SESSION_EXPIRED' });
});

test('two absent players close without a result, and precombat leave releases both seats', () => {
  const { rooms, a, b, ready, time } = fixture();
  ready();
  time(90_001);
  assert.throws(() => rooms.state(a.token), { code: 'SESSION_EXPIRED' });
  assert.throws(() => rooms.state(b.token), { code: 'SESSION_EXPIRED' });
  const second = fixture();
  assert.equal(second.send(0, { kind: 'leave' }).state.phase, 'closed');
  assert.throws(() => second.rooms.state(second.b.token), { code: 'SESSION_EXPIRED' });
});

test('relay receives only opaque revisions and a relay failure leaves committed state intact', () => {
  const calls = [];
  const { rooms, a, b, ready, send } = fixture({
    publish: (...args) => { calls.push(args); throw new Error('relay offline'); },
  });
  ready();
  send(0, { kind: 'fire', x: 0, y: 5 });
  assert.equal(rooms.state(a.token).shots.length, 1);
  assert.deepEqual(calls.map((call) => call[0]), Array(calls.length).fill(b.state.topic));
  assert.deepEqual(calls.map((call) => call.slice(1)), calls.map((_, i) => [i + 1]));
});

test('chat limits count Unicode code points and keep only the latest 50 messages', () => {
  const { rooms, b, time, send } = fixture();
  const emoji = '⚓😀';
  send(0, { kind: 'chat', text: emoji.repeat(120) });
  assert.throws(() => send(0, { kind: 'chat', text: emoji.repeat(121) }), { code: 'INVALID_MESSAGE' });
  for (let i = 0; i < 4; i++) send(0, { kind: 'chat', text: '<b>Hello</b>' });
  assert.throws(() => send(0, { kind: 'chat', text: 'over limit' }), { code: 'CHAT_RATE_LIMIT' });
  send(1, { kind: 'chat', text: 'independent seat' });
  for (let i = 1; i <= 10; i++) {
    time(i * 10_000);
    rooms.state(b.token);
    for (let j = 0; j < 5; j++) send(0, { kind: 'chat', text: String(i) });
  }
  const chat = rooms.state(b.token).chat;
  assert.equal(chat.length, 50);
  assert.equal(chat[0].sequence, 7);
  assert.equal(chat.at(-1).sequence, 56);
});

test('mutual rematch resets the match and retains room chat', () => {
  const { rooms, a, b, ready, send } = fixture();
  ready();
  send(1, { kind: 'chat', text: 'Good luck' });
  const targets = fleet(5).flatMap(cells);
  for (const [index, target] of targets.entries()) {
    send(0, { kind: 'fire', ...target });
    if (index < targets.length - 1) send(1, { kind: 'fire', x: index % 10, y: 7 + Math.floor(index / 10) });
  }
  assert.equal(send(0, { kind: 'rematch' }).state.phase, 'finished');
  const next = send(1, { kind: 'rematch' }).state;
  assert.equal(next.phase, 'placement');
  assert.notEqual(next.matchId, b.state.matchId);
  assert.deepEqual(next.shots, []);
  assert.equal(next.chat.length, 1);
  assert.throws(() => send(1, { kind: 'ready', matchId: b.state.matchId, fleet: fleet() }), { code: 'ROUND_CHANGED' });
  ready();
  assert.equal(rooms.state(a.token).turn, 1);
});

test('finished room retention releases its credentials and relay topic at the deadline', () => {
  const released = [];
  const { rooms, a, b, ready, send, time } = fixture({ releaseTopic: (topic) => released.push(topic) });
  ready();
  assert.equal(send(0, { kind: 'leave' }).state.reason, 'forfeit');
  for (let elapsed = 20_000; elapsed < 300_000; elapsed += 20_000) {
    time(elapsed);
    assert.equal(rooms.state(b.token).phase, 'finished');
  }
  time(299_999);
  assert.equal(rooms.state(b.token).winner, 1);
  assert.deepEqual(released, []);
  time(300_000);
  assert.throws(() => rooms.state(b.token), { code: 'SESSION_EXPIRED' });
  assert.throws(() => rooms.state(a.token), { code: 'SESSION_EXPIRED' });
  assert.deepEqual(released, [b.state.topic]);
});
