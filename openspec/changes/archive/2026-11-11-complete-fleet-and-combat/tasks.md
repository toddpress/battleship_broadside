## 1. Implementation and verification

- [x] 1.1 After authority and room phases are defined, write seeded property tests for fleet generation and fixed examples for edges, overlap and the two length-three ship IDs.
- [x] 1.2 Implement legal-draft validation and bounded auto-placement, then add drag, rotate and keyboard controls with invalid preview. Verify a rejected draft leaves readiness unchanged.
- [x] 1.3 Commit ready once per seat and start only when both have valid fleets. Exercise simultaneous ready commands, stale revisions, and attempted editing after lock.
- [x] 1.4 Resolve shots as a pure transition, retain shot IDs and sink metadata, and verify alternating turns on both outcomes. Play through to a deterministic victory and assert post-game fire rejection.
- [x] 1.5 Assert partial hits never reveal other ship cells in either snapshot and a forfeit preserves surviving enemy geometry secrecy.
