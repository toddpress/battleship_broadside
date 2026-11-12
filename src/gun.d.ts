declare module 'gun/gun' {
  type Chain = { on(listener: (value: unknown) => void): Chain; off(): void };
  export default function Gun(options: {
    peers: string[]; localStorage: boolean; radisk: boolean; axe: boolean; WebRTC: boolean;
  }): { get(key: string): Chain };
}
