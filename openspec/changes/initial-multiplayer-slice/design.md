# Design

## Architecture
Browser (Three.js/Vite) -> Express API (join, state, shoot, leave) -> Matchmaker -> pure Battleship engine.
Server -> GunDB match revision channel -> Browser (refresh private view on update).

## Decisions
1. Use the server as the sole matchmaking and game-rule authority: GunDB is eventually consistent and cannot provide exclusive first-come-first-served pairing on its own.
2. Keep randomized fleet locations and session tokens in server memory, never in GunDB.
3. Use GunDB only for public match events. HTTP polling every 2.5s provides recovery when relay delivery lags.
4. MVP uses generated fleets and click-to-target 3D tiles. No manual ship placement yet.

## Tradeoffs and next iteration
Single-process ephemeral sessions; no horizontal scale, reconnect durability beyond process lifetime, anti-cheat identity, or public internet deployment controls. For deployment, move authoritative sessions into a transactional backing store, add authentication, and rate limits. Public Gun records are untrusted notifications; the client always fetches authoritative private snapshots.
