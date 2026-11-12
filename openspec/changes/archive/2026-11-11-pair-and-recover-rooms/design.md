## Context

The queue stores unmatched tokens; pairing immediately starts combat. A failed refresh clears the credential, and expiration can award a win without a reconnect window.

## Decision R

Within one synchronous store mutation, sweep, choose oldest eligible room by queue sequence, recheck capacity, reserve the second seat and advance revision. Use states waiting → placement → playing → finished → closed. Lease every 10s; mark absent after 30s, expire 90s after last contact. An absent player pauses new ready/fire commands. At expiry resolve one expired seat against a present opponent as forfeit during combat; abandon precombat, or abandon if both seats are absent. Explicit leave closes precombat and forfeits combat. Retain a finished room for five minutes, then clean up. A fresh server epoch invalidates prior sessions.

## Tradeoffs

Gun transactions cannot enforce room capacity. Holding a disconnected seat trades immediate turnover for reconnectability. Single process keeps presence ordering deterministic; restart recovery is outside scope.

## Verification

Fake-clock lifecycle and concurrent pairing tests plus browser relay-offline and reload checks.
