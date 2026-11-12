import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createApp } from '../server/http.ts';
import { Rooms } from '../server/rooms.ts';
import { SHIPS } from '../shared/protocol.ts';

test('HTTP authority validates origin, auth, bodies, simultaneous revisions and privacy', async (context) => {
  const server = createServer(createApp(new Rooms()));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const root = 'http://127.0.0.1:' + server.address().port + '/api/v1/';
  const post = (path, body, token = '', headers = {}) => fetch(root + path, {
    method: 'POST', body: JSON.stringify(body), headers: {
      'content-type': 'application/json', authorization: 'Bearer ' + token, ...headers,
    },
  });
  assert.equal((await fetch(root + 'state')).status, 401);
  assert.equal((await post('sessions', {}, '', { origin: 'https://example.invalid' })).status, 403);
  const joined = await Promise.all(Array.from({ length: 3 }, () => post('sessions', {})));
  assert.ok(joined.every((response) => response.status === 201 && response.headers.get('cache-control') === 'no-store'));
  const participants = await Promise.all(joined.map((response) => response.json()));
  const pairedRoom = participants.find((player) => player.state.phase === 'placement').state.roomId;
  const paired = participants.filter((player) => player.state.roomId === pairedRoom);
  assert.equal(paired.length, 2);
  const matchId = paired.find((player) => player.state.matchId).state.matchId;
  const commands = paired.map(({ state }, index) => ({
    id: 'cmd-' + index, roomId: state.roomId, matchId, revision: 0, kind: 'ready',
    fleet: SHIPS.map(({ id }, y) => ({ id, x: 0, y: y + index * 5, vertical: false })),
  }));
  const outcomes = await Promise.all(commands.map((command, index) => post('commands', command, paired[index].token)));
  assert.deepEqual(outcomes.map((response) => response.status).sort(), [200, 409]);
  const accepted = outcomes.findIndex((response) => response.ok);
  const retry = await post('commands', commands[accepted], paired[accepted].token);
  assert.equal((await retry.json()).state.matchRevision, 1);
  const snapshot = await fetch(root + 'state', { headers: { authorization: 'Bearer ' + paired[1 - accepted].token } });
  const view = await snapshot.json();
  assert.deepEqual(view.fleet, []);
  assert.equal(view.ready.filter(Boolean).length, 1);
  assert.ok(!JSON.stringify(view).includes(paired[accepted].token));
  assert.equal((await post('commands', { ...commands[0], x: {} }, 'unknown')).status, 401);
  assert.equal((await post('commands', { kind: 'fire' }, paired[0].token)).status, 400);
  assert.equal((await fetch(root + 'commands', {
    method: 'POST', body: '{', headers: { 'content-type': 'application/json' },
  })).status, 400);
});
