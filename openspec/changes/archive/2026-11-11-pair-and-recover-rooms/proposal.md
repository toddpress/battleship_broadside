## Why

The queue stores unmatched tokens; pairing immediately starts combat. A failed refresh clears the credential, and expiration can award a win without a reconnect window.

## What Changes

Create a waiting room per eligible odd entrant, use FIFO for pairing, and transition to placement when its second seat commits. Preserve two seats through reconnect. Keep animated waiting and polling fallback.

## Capabilities

### Modified Capabilities

- `matchmaking`

## Impact

Dependencies — establish-authoritative-core

Gun transactions cannot enforce room capacity. Holding a disconnected seat trades immediate turnover for reconnectability. Single process keeps presence ordering deterministic; restart recovery is outside scope.

## Acceptance

Fake-clock lifecycle and concurrent pairing tests plus browser relay-offline and reload checks.
