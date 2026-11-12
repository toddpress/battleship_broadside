## Context

Only five Node tests exist. Existing OpenSpec artifacts fail strict validation. There is no independent local review, browser verification, performance evidence, or SDD guide.

## Decision Q

At each spec, architecture and plan gate send a fresh request to Ollama containing the named artifact, explicit references and criteria. Capture model ID, input hashes and structured findings, and adjudicate against revised artifacts. Use drift review after implementation. Document an example lowering a chat limit and tracing it through requirement, design, implementation and evidence. Archive completed changes through OpenSpec only after verification.

## Tradeoffs

A cloud reviewer would change the privacy boundary. Structured model findings are advisory and require adjudication. CLI validation and deterministic tests provide reproducible checks.

## Verification

Review harness tests for malformed output and isolation; strict OpenSpec, full build, unit/integration and browser evidence, performance report and drift review.
