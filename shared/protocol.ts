export const SIZE = 10;
export const SHIPS = [
  { id: 'carrier', name: 'Carrier', length: 5 },
  { id: 'battleship', name: 'Battleship', length: 4 },
  { id: 'cruiser', name: 'Cruiser', length: 3 },
  { id: 'submarine', name: 'Submarine', length: 3 },
  { id: 'destroyer', name: 'Destroyer', length: 2 },
] as const;
export type Seat = 0 | 1;
export type Cell = { x: number; y: number };
export type Placement = Cell & { id: typeof SHIPS[number]['id']; vertical: boolean };
export type Shot = Cell & { id: number; by: Seat; hit: boolean; sunk: Placement | null };
export type Phase = 'waiting' | 'placement' | 'playing' | 'finished' | 'closed';
export type Snapshot = {
  roomId: string; topic: string; roomRevision: number; seat: Seat; phase: Phase;
  matchId: string | null; matchRevision: number; turn: Seat | null; winner: Seat | null;
  reason: 'fleet-destroyed' | 'forfeit' | 'abandoned' | null;
  present: [boolean, boolean]; ready: [boolean, boolean]; votes: [boolean, boolean];
  fleet: Placement[]; shots: Shot[];
  chat: { sequence: number; from: Seat; text: string; at: string }[];
};
export type Command = { id: string; roomId: string } & (
  | { kind: 'ready'; matchId: string; revision: number; fleet: Placement[] }
  | { kind: 'fire'; matchId: string; revision: number; x: number; y: number }
  | { kind: 'chat'; text: string }
  | { kind: 'rematch'; matchId: string }
  | { kind: 'leave' }
);

export function cells(ship: Placement): Cell[] {
  const length = SHIPS.find(({ id }) => id === ship.id)?.length ?? 0;
  return Array.from({ length }, (_, offset) => ({
    x: ship.x + (ship.vertical ? 0 : offset),
    y: ship.y + (ship.vertical ? offset : 0),
  }));
}
export function inBounds({ x, y }: Cell) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}
export const cellKey = ({ x, y }: Cell) => y * SIZE + x;
export const label = ({ x, y }: Cell) => String.fromCharCode(65 + x) + (y + 1);

export function validFleet(fleet: readonly Placement[]) {
  if (fleet.length !== SHIPS.length) return false;
  const occupied = new Set<number>();
  for (const { id } of SHIPS) {
    const ship = fleet.find((placement) => placement.id === id);
    if (!ship || !inBounds(ship) || typeof ship.vertical !== 'boolean') return false;
    for (const cell of cells(ship)) {
      if (!inBounds(cell) || occupied.has(cellKey(cell))) return false;
      occupied.add(cellKey(cell));
    }
  }
  return true;
}
export function randomFleet(random = Math.random): Placement[] {
  const fleet: Placement[] = [];
  const occupied = new Set<number>();
  for (const { id, length } of SHIPS) {
    const candidates: Placement[] = [];
    for (const vertical of [false, true]) {
      for (let y = 0; y <= SIZE - (vertical ? length : 1); y++) {
        for (let x = 0; x <= SIZE - (vertical ? 1 : length); x++) {
          const ship = { id, x, y, vertical };
          if (cells(ship).every((cell) => !occupied.has(cellKey(cell)))) candidates.push(ship);
        }
      }
    }
    const ship = candidates[Math.floor(random() * candidates.length)];
    if (!ship) return SHIPS.map(({ id }, y) => ({ id, x: 0, y, vertical: false }));
    fleet.push(ship);
    for (const cell of cells(ship)) occupied.add(cellKey(cell));
  }
  return fleet;
}
