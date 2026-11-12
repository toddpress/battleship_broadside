## Why

The baseline generates both fleets during pairing and immediately allows combat. Existing shot logic enforces turns but lacks ready state and durable per-shot sinking information.

## What Changes

Add a validated deployment draft, random auto-place, manual drag and rotation, explicit ready for each seat, and full match completion. Keep classic alternating single-shot turns and 10×10 play.

## Capabilities

### Modified Capabilities

- `gameplay`

## Impact

Dependencies — establish-authoritative-core, pair-and-recover-rooms

Automatically readying both players removes deployment choice. Maintaining a separate client rule implementation invites drift. Shared coordinate helpers may assist preview; final validation stays server-side.

## Acceptance

Seeded placement invariant tests, edge/overlap validation, repeated or out-of-turn shots, complete match replay, and privacy assertions.
