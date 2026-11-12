# Broadside verification

## Reproduce

| Check | Command | Observed result |
| --- | --- | --- |
| Strict TypeScript, unit/HTTP tests and bundle | `npm run check` | 12 tests passed and the Vite production build succeeded. |
| Browser play | `npm run test:e2e` | Three functional tests passed. The GPU sample runs separately. |
| GPU benchmark | `npm run test:perf` | 60 seconds at 1080p. 3,601 intervals, 16.7 ms p50 and p95, 43 peak draw calls, 17,384 peak triangles. |
| Specs | `openspec validate --all --strict` | All six current capability specs and the historical active change passed after archive. The prototype's historical draft declares no new deltas because the original requirements already live in the base specs. |

The documented development command also paired two independent browser contexts through the Vite HTTP and GunDB proxies.

## Traceability

| Requirements | Actual implementation | Verification |
| --- | --- | --- |
| Participant snapshots and command serialization | [HTTP validation](../server/http.ts), [authority and projections](../server/rooms.ts) | [HTTP contract](../tests/api.test.js) submits concurrent joins and simultaneous ready requests, checks bearer, origin and response shape, then retries the accepted command. [Authority tests](../tests/engine.test.js) check changed retry payloads and old-round commands. |
| FIFO pairing, expiration and notification recovery | [Room lifecycle](../server/rooms.ts), [GunDB adapter](../server/index.ts), [browser recovery](../src/session.ts) | [Authority tests](../tests/engine.test.js) cover two-seat partitioning, 30/90-second boundaries, one- and two-seat expiry, five-minute retention, restart, relay failure and payload. [Browser suite](../tests/browser/game.spec.ts) covers the isolated third entrant, reconnect in combat, and polling through a blocked GunDB socket. |
| Battleship rules and fleet secrecy | [Placement rules](../shared/protocol.ts), [shot resolution](../server/rules.ts), [participant projection](../server/rooms.ts), [placement and actions](../src/main.ts) | [Rule tests](../tests/engine.test.js) cover 256 seeded fleets, edge and overlap rejection, alternating turns, sink-only reveal, duplicate and out-of-turn fire, victory and forfeit. The browser starts with a hidden enemy board and plays all 17 hits to victory. |
| Tactical views, effects and frame budget | [Renderer](../src/battlefield.ts), [vessels](../src/vessels.ts), [asset provenance](ASSETS.md) | [Browser suite](../tests/browser/game.spec.ts) checks WebGL, keyboard and pointer targeting after orbit, and resource release on two remount cycles. [Benchmark](../tests/browser/performance.spec.ts) covers placement, view switching, hits, misses and sinking. |
| Chat, rematch and connection state | [Room commands](../server/rooms.ts), [HUD](../src/main.ts), [browser session](../src/session.ts) | [Authority tests](../tests/engine.test.js) check Unicode, rate, retention and stale-round protection. Browser verifies literal markup, preserved input focus and draft, reconnect and two-vote rematch. |
| Independent review and SDD | [Harness](../scripts/goldfish.mjs), [reports](goldfish/README.md), [walkthrough](SDD-DEMO.md) | [Harness test](../tests/goldfish.test.js) checks loopback, explicit inputs, duplicate rejection and malformed output. OpenSpec validates schema, and fresh Goldfish requests review the gated artifacts and actual code. |

## Performance and assets

Apple M4 Max, Darwin 25.5.0, Playwright Chromium 158.0.8127.18, Metal via ANGLE. Headless browser with hardware-backed WebGL2, 1920×1080 viewport, DPR 1. The test samples browser animation-frame intervals. Low quality caps DPR at 1 and halves the particle count. No integrated-GPU or cross-browser timing is claimed.

[Raw frame sample and measured budget](evidence/performance.json)

Functional screenshots are generated under `test-results/`. Benchmark screenshots and raw data are generated under `test-results-perf/`.

## Implementation journal

- Baseline passed five tests and failed strict TypeScript in the client refresh code. The typed transport and split client restore the production build.
- Server state is process-local. Gun topics carry revision hints and are released at room closure. A browser can reclaim its seat until the server lease expires. GunDB interruption falls back to authenticated polling.
- Rendering uses original hulls, a shader ocean, instanced tiles, pooled effects and a keyboard board that also works if WebGL initialization fails. Vite emits a chunk-size advisory for the combined Three.js client.
