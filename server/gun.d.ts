declare module 'gun' {
  export default function Gun(options: {
    web: import('node:http').Server; radisk: boolean; localStorage: boolean;
    multicast: boolean; axe: boolean; peers: string[];
  }): { get(key: string): { put(data: { revision: number }): void; off(): void } };
}
