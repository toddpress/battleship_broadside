import { cellKey, cells, inBounds } from '../shared/protocol.ts';
import type { Cell, Placement, Seat, Shot } from '../shared/protocol.ts';

export const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;

export function resolveShot(fleet: readonly Placement[], shots: readonly Shot[], by: Seat, target: Cell):
  { error: 'INVALID_COORDINATE' | 'REPEATED_TARGET' } | { shot: Shot; won: boolean } {
  if (!inBounds(target)) return { error: 'INVALID_COORDINATE' } as const;
  const key = cellKey(target);
  const prior = new Set(shots.filter((shot) => shot.by === by).map(cellKey));
  if (prior.has(key)) return { error: 'REPEATED_TARGET' } as const;
  prior.add(key);
  const struck = fleet.find((ship) => cells(ship).some((cell) => cellKey(cell) === key));
  const sunk = struck && cells(struck).every((cell) => prior.has(cellKey(cell))) ? { ...struck } : null;
  const won = Boolean(sunk) && fleet.every((ship) => cells(ship).every((cell) => prior.has(cellKey(cell))));
  const shot: Shot = { x: target.x, y: target.y, id: shots.length + 1, by, hit: Boolean(struck), sunk };
  return { shot, won };
}
