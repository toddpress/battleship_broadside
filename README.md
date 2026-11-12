# Project Broadside

A two-player browser Battleship game and a local spec-driven development demo. Captains pair in FIFO rooms, place fleets on a 10×10 board, and take turns until a fleet is destroyed. GunDB relays room revision hints and the server validates all commands.

## Run locally

Use Node 24 and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173 in two independent browser windows and select **Find opponent** in each. A third captain waits for a fourth. For a built version, use `npm run build && npm run server`, then open http://127.0.0.1:8787. Both servers bind to loopback by default. State is in memory and restart ends existing sessions.

## Play

- In deployment, select a ship then click a coordinate, or drag a ship button onto the tactical grid. Use **Rotate selected ship** or **R** while focused on the board. **Randomize** produces a legal fleet. Lock your fleet when ready.
- Drag the 3D scene to orbit, right-drag to pan, and scroll to zoom. On the keyboard board, use arrows to move and Enter to select. Switch between **Your fleet** and **Enemy waters**.
- Select a target and confirm **Fire at** the coordinate. Hits and misses both pass the turn. The enemy ship appears once sunk. Both captains can agree to play again after the match.
- The HUD distinguishes network interruption and opponent absence. A short interruption keeps the same seat. Chat is plain text and stays within the room.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:perf
```

[Architecture checkpoint](docs/BROADSIDE-CHECKPOINT.md) · [Verification evidence](docs/VERIFICATION.md) · [SDD demo](docs/SDD-DEMO.md) · [Local Goldfish review](docs/goldfish/README.md)
