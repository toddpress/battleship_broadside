## 1. Implementation and verification

- [x] 1.1 Write table-driven DTO tests for waiting, placement, playing, win, and forfeit. Verify only allowed keys and cells are serialized for each seat.
- [x] 1.2 Type the domain and introduce a repository adapter and synchronous use case boundary. Inject clock, IDs and RNG into the application, then prove domain tests run without Express or Gun.
- [x] 1.3 Define tagged request/response types, implement strict request validation and bearer auth. Verify the API rejects missing credentials and invalid JSON, and returns no-store.
- [x] 1.4 Add receipt and revision checks in the same mutation as the game update. Verify an identical retry, an ID reused with different content and two concurrent commands for the same revision.
- [x] 1.5 Configure strict type checks for server and browser, and loopback binding for development and production preview. Run npm run check and capture baseline failure resolution.
