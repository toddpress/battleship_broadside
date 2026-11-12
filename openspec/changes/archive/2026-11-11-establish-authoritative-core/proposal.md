## Why

The JavaScript engine mutates shared match records; transport, sessions, and matchmaking share responsibilities. The client build fails on an untyped HTTP result.

## What Changes

Move to strict TypeScript while retaining Express, Vite and a single Node authority. Separate pure rules, room use cases, repository, HTTP DTOs, and notification publisher. Use an in-memory adapter with documented restart semantics. Retain the game’s coordinate convention.

## Capabilities

### New Capabilities

- `server-authority`

## Impact

Dependencies — Imported prototype and installed Node 24 / OpenSpec 1.17.

A distributed store adds deployment and consistency overhead. Directly sharing internal records with clients reduces conversion code but exposes private fields when records grow. Existing sessions expire on upgrade or restart.

## Acceptance

API contract tests for invalid credentials, stale revisions, command retry and unchanged state; strict client and server build.
