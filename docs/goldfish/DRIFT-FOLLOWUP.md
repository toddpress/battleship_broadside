# Follow-up drift adjudication

The first combined client follow-up returned malformed findings. Independent smaller packets produced the [session report](drift-session-r2.json) and the [rendering report](drift-render-r2.json). An intermediate rendering response wrapped its JSON in a code fence and was rejected by the harness.

## Session and HUD

1. **Covered by server verification.** The server caps snapshots at 50 chat entries and the rollover test sends 56 messages. The client consumes the authoritative snapshot.
2. **Declined.** Transport timeouts and temporary offline failures both enter the same reconnect path. The link status communicates when the player can act again.
3. **Covered.** The submit handler validates the 240-code-point limit. The 480-code-unit field cap permits astral code points without splitting the accepted limit.
4. **Accepted.** Connection status is a polite live region. The DOM text is replaced only when the visible status changes.
5. **Covered.** Disposal removes both registered listeners. Removing a listener that was never registered is safe.

## Rendering

1. **Covered.** Pointer selection uses the current camera matrices to intersect a fixed board plane. The browser verifies the same hover and selected coordinate before and after orbit, and keyboard input uses those same board coordinates.
2. **Covered within scope.** The approved benchmark names the reference Mac and the implementation provides measured adaptive thresholds. The report identifies the exact GPU/browser, sample and tier.
3. **Covered.** The application clears the scene reference and removes the page teardown listener after disposal. The browser checks resource counters after two independent teardown and remount cycles.
4. **Covered.** The animation tick reads the motion preference and cancels a shell or effect already in progress.
5. **Covered.** The pool capacity is fixed and active particles fall from 48 to 24 in low quality. A configurable pool was declined, consistent with the first disposition.
