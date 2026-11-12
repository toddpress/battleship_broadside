import { createServer } from 'node:http';
import { resolve } from 'node:path';
import Gun from 'gun';
import { createApp } from './http.ts';
import { Rooms } from './rooms.ts';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.BROADSIDE_HOST ?? '127.0.0.1';
const origins = [
  ...[5173, port].flatMap((p) => ['127.0.0.1', 'localhost'].map((name) => 'http://' + name + ':' + p)),
  ...(process.env.BROADSIDE_ORIGINS?.split(',').map((origin) => origin.trim()) ?? []),
];
const relayEnabled = process.env.BROADSIDE_RELAY !== 'off';
const rooms = new Rooms({
  publish: (topic, revision) => relay?.get('broadside-v2:' + topic).put({ revision }),
  releaseTopic: (topic) => {
    if (relay) setTimeout(() => relay.get('broadside-v2:' + topic).off(), 1_000).unref();
  },
  onPublishError: (error) => console.warn('Broadside relay publish failed', error),
});
const server = createServer(createApp(rooms, { origins, publicDir: resolve('dist') }));
const relay = relayEnabled ? Gun({ web: server, radisk: false, localStorage: false, multicast: false, axe: false, peers: [] }) : null;
const sweep = setInterval(() => rooms.sweep(), 2_000);
sweep.unref();
server.listen(port, host, () => console.log('Broadside listening at http://' + host + ':' + port));
