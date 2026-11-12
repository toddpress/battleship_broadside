## Context

The JavaScript engine mutates shared match records; transport, sessions, and matchmaking share responsibilities. The client build fails on an untyped HTTP result.

## Decision A

Keep mutations synchronous between authorization and commit, including revision increment and idempotency receipt. Publish only after commit. Validate incoming tagged DTOs with runtime guards at the HTTP boundary. Scope receipts to seat and round, retain the latest 256 accepted ready/fire receipts, and delete them on round replacement or room cleanup. Revisions prevent reapplying evicted commands. Use an injected clock, ID source, and RNG. DTOs are constructed by allowlist; API responses use no-store. Same-origin browser transport with loopback defaults, Origin checks for mutations, and body/rate bounds.

## Tradeoffs

A distributed store adds deployment and consistency overhead. Directly sharing internal records with clients reduces conversion code but exposes private fields when records grow. Existing sessions expire on upgrade or restart.

## Verification

API contract tests for invalid credentials, stale revisions, command retry and unchanged state; strict client and server build.
