# Goldfish adjudication

The reports use fresh local `gpt-oss:20b` requests. Numbers follow finding order in each report. The first plan response was non-JSON and produced no report. A fresh run with the task files returned the structured plan report. The spec and architecture revisions received a second independent pass. This checkpoint reviews the six changes together at each gate. Implementation drift review follows implementation.

## Specification, first pass

1. **Accepted.** Added the lease timeline and exact boundaries to the checkpoint.
2. **Accepted.** The placement rejection scenario now requires unchanged phase and readiness and no publication.
3. **Accepted.** Added a 256-entry accepted-command receipt window per seat, with round and room cleanup.
4. **Deferred to HUD implementation.** Visible states and focus behavior are specified. HUD component hierarchy is an implementation decision.
5. **Accepted.** Added a scenario for closure when both seats are absent at expiry.
6. **Accepted for measurement.** Design requires raw frame intervals and p50/p95. The claim that an existing harness reports averages is unsupported. General CI runs functional checks. The GPU benchmark runs on the recorded reference Mac.
7. **Accepted.** The spec now requires explicit input paths and SHA-256 hashes. The report itself is the packet manifest.

## Architecture, first pass

1. **Accepted with a path version.** The checkpoint uses the `/api/v1` namespace. The prototype's local API and sessions are replaced together. A semantic-version response header and deprecation program add no value for this migration.
2. **Accepted.** Centralized the 10/30/90-second behavior in the checkpoint.
3. **Accepted.** Added runtime guards for tagged HTTP requests.
4. **Accepted with FIFO semantics.** Capacity is rechecked inside the server's synchronous mutation. An excess entrant creates or joins another room.
5. **Accepted.** The gameplay spec explicitly permits touching and forbids overlap.
6. **Accepted.** The renderer design now sets measured quality transitions and specifies low-quality fallback.
7. **Declined.** Unicode code points are the intended unit. Count using the JavaScript string iterator. A surrogate-pair emoji counts once. A multi-code-point joined emoji counts as its constituent code points. Verify both in chat tests.

## Plan

1. **Covered.** Verification task 1.4 captures GPU and privacy evidence and links it to the requirements. Store sanitized assertion results and synthetic fixture data, with credentials and hidden fleets excluded.
2. **Accepted as a test detail.** Compare elapsed lease time using an injected monotonic clock in-process. Use UTC ISO timestamps for display or recorded evidence. Test those concerns independently.
3. **Accepted as a test detail.** Fake-clock cases cover threshold minus 1ms, threshold, and threshold plus 1ms, and a successful renewal before expiry.
4. **Covered.** Gameplay task 1.1 specifies deterministic edge and overlap examples. Task 1.2 asserts rejection preserves readiness.
5. **Accepted as a test detail.** High quality uses DPR up to 1.5 and full pooled effects. Low quality caps DPR at 1, reduces active particles and disables soft shadows where enabled. Record the chosen tier with the trace.
6. **Covered.** The design specifies five accepted messages per ten seconds per seat. Test the sixth message, independent seats, and window rollover.

## Specification, second pass

1. **Covered by the authority and room-experience contracts.** Authenticate the sender using the bearer credential and resolve the peer from server-owned room seats. The request has no recipient field. Keep the latest 50 messages in memory until closure. Durable encryption and an audit history would add a persistence scope the demo does not require.
2. **Covered by the projection allowlist.** An unsunk ship contributes only shot coordinates and outcomes already visible to that participant. Omit its identity, orientation and unhit cells, including after a forfeit. Verify this in both projections and capture the relay payload separately.
3. **Covered.** Command serialization's concurrent scenario and authority task 1.4 require two requests for the same expected revision. Use a synchronization barrier in the integration test.
4. **Declined as a release matrix.** The requested recorded reference benchmark plus adaptive fallback gives a reproducible performance target. Desktop and tablet functional checks remain required. Report the GPU and browser used.
5. **Covered by scope.** Authentication binds the seat, and room ID, match ID and revision bind the round. Old room/round commands cannot mutate the new scope. A client timestamp adds no authority.

## Architecture, second pass

1. **Clarified.** Process restart invalidates prior credentials and room topics, including in-flight games. The client receiving 401 clears that expired session and offers a new search. No room is rehydrated under the selected ephemeral-store architecture. Verify restart and expired-session UI explicitly.
2. **Covered.** The synchronous use-case boundary serializes commits without a per-room lock. The losing expected-revision check returns 409. The checkpoint defines the guarded ready retry.
3. **Clarified.** The server's periodic sweep removes finished room state, credentials, receipts and chat five minutes after finish. Clients unsubscribe when the room closes. Gun topic records contain only hints and are not a retention authority. Drop publisher references on close and measure relay memory under room churn during hardening.
4. **Covered.** The revised gameplay spec explicitly allows touching and forbids overlap. Placement shows legal and illegal preview states.
5. **Declined.** Fixed and documented thresholds make the benchmark reproducible. Low quality is the fallback. Tuning is an explicit spec change if measurements justify it.
6. **Covered.** The code-point policy and emoji checks are in the first-pass disposition.
7. **Accepted.** Enforce the expected keys and field types in the runner and fail the gate for malformed or incomplete output. Reports identify the model, timestamp and hashed inputs. A future model change requires fresh gate runs. Keep the previous reports for comparison.

## References

- [GunDB graph and synchronization semantics](https://gun.eco/docs/Introduction)
- [Three.js camera, instancing and renderer APIs](https://threejs.org/docs/)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
