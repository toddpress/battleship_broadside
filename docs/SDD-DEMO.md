# Reproduce the Broadside SDD demo

## Run the example

1. Start Broadside with `npm ci && npm run dev`. In two independent browser sessions, find an opponent, place fleets and trade shots. In a third session, verify it waits separately.
2. Start a new change request such as “Lower the room chat maximum from 240 to 120 Unicode code points while preserving the five-per-ten-second rate limit.”
3. Use OpenSpec 1.17 or the locally installed compatible CLI. Run `openspec new change lower-chat-limit`. Inspect the current `Participant chat` requirement and the room-experience design. Write a proposal, a MODIFIED requirement preserving existing scenarios, a design and checked-at-verification tasks.
4. Add scenarios for a message with exactly 120 code points, one with 121, and a joined emoji. Map them to the validator in `server/rooms.ts` and the chat regression test in `tests/engine.test.js`. Align the UI error copy and input limit in `src/main.ts`. Leave the rate limit and latest-50 retention policy explicit.
5. Run `openspec validate lower-chat-limit --strict`. Run the spec, architecture and plan reviews with `node scripts/goldfish.mjs` using only explicit files. Record dispositions and rerun changed artifacts. Have the human approve the consolidated change before editing application code when the change affects a product requirement or contract.
6. Implement the approved change, run `npm run check` and `npm run test:e2e`, then add results and actual source references to the evidence. Rerun the drift review. Check tasks only after observing results. Archive through OpenSpec when the criteria are met.

OpenSpec syntax, tests, hashes and structured report checks are deterministic. The local model critiques requirements and reasoning. The author adjudicates its findings and the human decides whether to approve the architecture. The benchmark records observed timing for a particular GPU/browser combination.

## Read the delivered change

- The [checkpoint](BROADSIDE-CHECKPOINT.md) records baseline failures, approved decisions and the execution order.
- The [local reviewer](goldfish/README.md) describes fresh loopback inference and preserved evidence.
- The [verification evidence](VERIFICATION.md) links behavior to actual implementation and test entry points.
