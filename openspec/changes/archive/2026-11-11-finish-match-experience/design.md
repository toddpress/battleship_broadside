## Context

The baseline rebuilds HUD markup on polling and offers a new search at game over. There is no same-room rematch or chat.

## Decision U

Use one API snapshot stream with room revision independent from match revision. Keep the latest 50 room messages with server timestamps and sequence numbers; accept up to 240 Unicode code points, 5 messages per 10 seconds per seat; display via text nodes. Both present seats voting rematch create a new match ID and clear fleets, shots, votes and effects while retaining room chat until room close. Browser separates transport loss from opponent presence and blocks stale actions.

## Tradeoffs

Use consent instead of automatic rematches to preserve the ability to exit. Chat is ephemeral and participant-scoped. No accounts or history export in this local demo.

## Verification

Two-context chat, rate and capacity checks; rejoin, rematch race and stale-round checks; desktop and tablet screenshots.
