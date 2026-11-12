## Context

A single client module renders a perspective board with 100 individual tile materials, a box-like vessel and frame-dependent water movement. The sidebar contains a separate miniature fleet view.

## Decision V

Use a board plane for ray intersections and map points to integer cells. Use instanced tile/marker geometry, shared vessel parts, shader waves driven by elapsed time, pooled shell/splash/smoke/fire effects, and a timed sink animation. Key animations by match ID and shot ID; initial hydration renders history without replay. Evaluate licensed GLB candidates and document provenance or use authored procedural hulls. Apply DPR caps (1.5 high, 1 low), and reduced-motion mode. Use two consecutive five-second windows with p95 above 25ms to lower quality and six windows below 20ms to restore it. Suspend measurement while hidden. Keep fixed reference-benchmark settings and separately log adaptive transitions.

## Tradeoffs

Use procedural silhouettes when redistribution or polygon budgets are uncertain. Real-time reflections and a full engine add GPU or integration costs. Browser-driven input remains separate from rules.

## Verification

Collect browser frame intervals over the complete 60-second active-tab sample. Compute p50 and p95 from the raw intervals and record peak draw calls and visible triangles. Use automated functional checks in general CI and record the GPU benchmark on the reference machine.

Playwright projection/input and render smoke checks; 60-second GPU-enabled benchmark and scene teardown check.
