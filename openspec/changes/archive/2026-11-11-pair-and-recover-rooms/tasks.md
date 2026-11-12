## 1. Implementation and verification

- [x] 1.1 After core contracts, write fake-clock transition tests for the waiting queue, pairing, presence, expiration, explicit leave and terminal retention.
- [x] 1.2 Commit FIFO selection and second-seat reservation in one use case. Submit four joins concurrently and assert room partition and stable seat order.
- [x] 1.3 Implement lease renewal, absence, return, abandon and forfeit using server time. Test exact 30s and 90s boundaries, two absent seats and old credentials after restart.
- [x] 1.4 Publish revisions after committed room mutations, including pairing of a waiting client. Assert the publisher receives exactly the topic and revision and that delivery failure cannot undo committed state.
- [x] 1.5 Implement refresh coalescing, room-revision comparison, timeout and polling. Verify blocked relay delivery, stale/duplicate hints, reload within grace and confirmed expiry.
