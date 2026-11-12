# Project Broadside

An **unclassified fictional** Three.js Battleship demo, built as an OpenSpec-driven vertical slice with GunDB live match notifications.

## Start on macOS

```bash
mkdir -p ~/Developer/projects
unzip ~/Downloads/broadside.zip -d ~/Developer/projects
cd ~/Developer/projects/broadside
npm install
npm run dev
```

Open `http://localhost:5173` in two distinct tabs or browsers. The first captain gets the radar waiting screen; joining as the second captain creates a match. A third waits for a fourth. Both clients may join from different machines if the backend is reachable, but this dev setup is for **trusted local development only**.

Run `npm run check` for unit tests and TypeScript/Vite build. For agent integration, install OpenSpec and run `openspec init --tools opencode` inside this folder; review output before committing. Existing specs and change documents are provided under `openspec/`.

## Architecture

- `src/`: Three.js scene, browser UI, API client, GunDB realtime subscription
- `server/engine.js`: pure Battleship rules (turns, shots, win condition)
- `server/matchmaker.js`: authoritative FIFO queue, sessions, expiration
- `server/index.js`: Express API and GunDB relay
- `tests/`: Node's built-in test runner
- `openspec/`: requirements, architecture decisions, and initial change

## Rules and multiplayer

The fleet is randomly deployed. Fire by clicking a tile on the 3D ocean, then pressing Fire. The server alone knows both fleets. The public GunDB graph carries **only** match status/turn/revision/last shot, not hidden fleets. The browser reads its own state over HTTP and uses GunDB for fast change notification, falling back to periodic polling. FIFO queue holds the odd player until the next arrives. Sessions expire after ~45 seconds without heartbeat. Abandoning an active match awards a win to the opponent.

## Known MVP constraints

This is a **prototype**, not production-ready public multiplayer. Single-process server, ephemeral match storage, bearer session tokens in sessionStorage, no authenticated identity, no rate limits, and no restart recovery. The rendering is a stylized 3D targeting battlefield rather than full ship-deck first-person combat. Public Gun writes are treated as untrusted wake-up messages, not authoritative game data. Google Fonts is used for optional styling, and may be removed for fully offline operation.

## Safety

Use only synthetic data and independent code. Do not place government systems information or classified/restricted material in this project.
