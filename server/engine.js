export const SIZE = 10;
export const FLEET = [5, 4, 3, 3, 2];
export const coordinate = (x, y) => `${x},${y}`;
export function makeFleet(rng = Math.random) {
  const occupied = new Set();
  const ships = [];
  for (const length of FLEET) {
    let placed = false;
    for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
      const horizontal = rng() < 0.5;
      const x = Math.floor(rng() * (SIZE - (horizontal ? length : 1) + 1));
      const y = Math.floor(rng() * (SIZE - (horizontal ? 1 : length) + 1));
      const cells = Array.from({ length }, (_, i) =>
        coordinate(x + (horizontal ? i : 0), y + (horizontal ? 0 : i)),
      );
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell));
      ships.push({ cells });
      placed = true;
    }
    if (!placed) throw new Error("Fleet placement failed");
  }
  return ships;
}
export function fire(match, player, x, y) {
  if (match.status !== "playing")
    return { error: "Match is not active", status: 409 };
  if (match.turn !== player) return { error: "Not your turn", status: 409 };
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= SIZE ||
    y >= SIZE
  )
    return { error: "Invalid coordinate", status: 400 };
  const key = coordinate(x, y);
  if (match.shots[player].some((s) => s.x === x && s.y === y))
    return { error: "Already fired there", status: 409 };
  const opponent = 1 - player;
  const ship = match.fleets[opponent].find((s) => s.cells.includes(key));
  const hit = Boolean(ship);
  const all = [...match.shots[player], { x, y, hit }];
  match.shots[player] = all;
  const sunk = Boolean(
    ship &&
    ship.cells.every((cell) =>
      all.some((s) => coordinate(s.x, s.y) === cell && s.hit),
    ),
  );
  const won = match.fleets[opponent].every((s) =>
    s.cells.every((cell) =>
      all.some((shot) => coordinate(shot.x, shot.y) === cell && shot.hit),
    ),
  );
  match.lastShot = { by: player, x, y, hit, sunk };
  match.revision++;
  if (won) {
    match.status = "finished";
    match.winner = player;
  } else match.turn = opponent;
  return { hit, sunk, won };
}
export function view(match, player) {
  return {
    id: match.id,
    status: match.status,
    player,
    turn: match.turn,
    winner: match.winner ?? null,
    revision: match.revision,
    lastShot: match.lastShot ?? null,
    ownShips: match.fleets[player].map((s) =>
      s.cells.map((c) => c.split(",").map(Number)),
    ),
    shotsFired: match.shots[player],
    incoming: match.shots[1 - player],
    opponentShips:
      match.status === "finished"
        ? match.fleets[1 - player].map((s) =>
            s.cells.map((c) => c.split(",").map(Number)),
          )
        : null,
  };
}
