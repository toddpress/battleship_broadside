## Context

The baseline generates both fleets during pairing and immediately allows combat. Existing shot logic enforces turns but lacks ready state and durable per-shot sinking information.

## Decision G

Represent five distinct ship IDs, lengths 5,4,3,3,2, integer origin and horizontal/vertical orientation. Validate bounds and disjointness from computed cells. Touching is allowed. Random placement uses a bounded candidate search with deterministic fallback. Commit fleet on ready, start with seat zero on first round, and alternate starter on rematches. Resolve and retain each shot with shot ID, outcome, and revealed geometry for a fully sunk ship.

## Tradeoffs

Automatically readying both players removes deployment choice. Maintaining a separate client rule implementation invites drift. Shared coordinate helpers may assist preview; final validation stays server-side.

## Verification

Seeded placement invariant tests, edge/overlap validation, repeated or out-of-turn shots, complete match replay, and privacy assertions.
