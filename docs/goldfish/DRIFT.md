# Implementation drift adjudication

The source-level passes send the enumerated OpenSpec files and source files to loopback Ollama. No source enters the spec, architecture or plan requests unless supplied in Markdown by the author.

## Server

1. **Covered.** The 30-second transition marks absence, publishes a room revision and pauses combat. Forfeit and closure are 90-second transitions. Fake-clock checks cover both.
2. **Covered.** Waiting and placement seats use the same absence clock. Pairing ignores an absent waiting seat. Placement cannot advance while its opponent is absent.
3. **Covered.** Each join generates a server credential. Session lookup follows the expiry sweep, so a removed credential cannot revive its seat.
4. **Declined.** Fleet commands contain five small placements, and chat writes contain one bounded message. History is returned by the server. The existing 12 KiB request limit covers these command schemas.
5. **Covered.** Rules permit touching, including diagonally. Cell intersection is the prohibited case.

## Client, first pass

1. **Covered.** The batch factory tracks each instanced mesh, geometry and material in the resource list. The teardown test observes geometry and texture counters returning to zero twice.
2. **Declined.** Fixed particle capacities and the benchmark's geometry budget keep the result reproducible. Low quality reduces the active count.
3. **Accepted.** Reduced motion already skipped new animations. It now cancels in-flight shell and particle effects when the preference changes.
4. **Covered.** Camera target is clamped each frame. The camera position is outside the board by design and its orbit and zoom are constrained.
5. **Covered.** The opt-in metrics probe reports frame intervals, draw calls, triangles and quality changes. The benchmark saves those data locally.
6. **Accepted.** Reconnect retry now backs off to an eight-second cap and resets on successful refresh.
7. **Covered.** The server owns lease expiry. The browser preserves credentials through temporary transport loss and clears them when the server confirms expiry.
8. **Accepted.** The client now checks the same 240-code-point limit before submission. The DOM's UTF-16 cap remains 480 to permit surrogate-pair characters.
9. **Covered.** Chat message text uses a text node and the browser test checks markup displays literally.
10. **Covered.** Server-issued snapshots assign a typed seat of 0 or 1. The two-seat invariant is enforced at pairing and verified under concurrent requests.
11. **Covered.** The chat send button has the accessible name “Send message,” used by the browser test.
