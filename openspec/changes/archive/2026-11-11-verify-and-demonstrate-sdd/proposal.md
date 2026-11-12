## Why

Only five Node tests exist. Existing OpenSpec artifacts fail strict validation. There is no independent local review, browser verification, performance evidence, or SDD guide.

## What Changes

Add isolated local review, deterministic checks, traceability and realistic reproducible evidence. Add a two-context browser campaign and make the SDD workflow repeatable without network inference.

## Capabilities

### New Capabilities

- `sdd-verification`

## Impact

Dependencies — all application changes for final verification; reviewer bootstrap before approval

A cloud reviewer would change the privacy boundary. Structured model findings are advisory and require adjudication. CLI validation and deterministic tests provide reproducible checks.

## Acceptance

Review harness tests for malformed output and isolation; strict OpenSpec, full build, unit/integration and browser evidence, performance report and drift review.
