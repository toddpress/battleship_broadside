# Local specification review

Run OpenSpec strict validation for each change before review. Invoke `node scripts/goldfish.mjs spec <new-report.json> <spec.md> [support.md ...]` from the project root. Substitute `architecture`, `plan` or `drift` at the other gates. The artifact is the first Markdown path and every supporting file is explicitly named. Each invocation uses a fresh request to loopback Ollama. Run `ollama list` to check for `gpt-oss:20b`.

Record each finding's disposition beside the report, with rationale, revision and follow-up verification. Review the revised inputs in a fresh request when changes are material. Use OpenSpec for schema validation and check requirement and task mappings mechanically where possible. The review reports preserve input SHA-256 hashes for comparison. Treat model findings as advisory, and record unavailable or incomplete reviews in the checkpoint.

See [adjudication](ADJUDICATION.md) for dispositions. Raw reports remain beside it.

The checkpoint hash in the latest architecture report matches [the preserved approved packet](approved-checkpoint.md). Active OpenSpec paths in reports refer to their locations when the requests ran. OpenSpec moves completed change directories into its archive, and verified task checkboxes are updated after review.

Drift reviews may explicitly reference local source files as well as Markdown. See [drift adjudication](DRIFT.md) for the post-implementation findings.

See [follow-up dispositions](DRIFT-FOLLOWUP.md) for the revised client.
