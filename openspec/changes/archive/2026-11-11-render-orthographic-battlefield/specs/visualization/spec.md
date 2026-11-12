## MODIFIED Requirements

### Requirement: Interactive naval battlefield
The client SHALL provide orthographic fleet and enemy views, constrained orbit, pan and zoom, coordinate hover/selection, a keyboard board alternative and explicit fire confirmation. Camera movement SHALL leave board coordinates stable.

#### Scenario: Interactive naval battlefield verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a player zooms and rotates before selecting a tile by pointer or keyboard
- **THEN** both methods select the same domain coordinate and only explicit confirmation sends a shot

#### Scenario: Aim and fire
- **WHEN** a player selects an untried tile on their turn
- **THEN** its coordinate is displayed and the fire confirmation becomes available

## ADDED Requirements

### Requirement: Combat effects and frame budget
The renderer SHALL visualize authoritative shell flight, miss splash, hit fire and destruction/sinking. It SHALL cap particle and scene counts, dispose GPU resources on teardown, and reduce motion on request. At 1920×1080 the target SHALL be median frame time at most 16.7ms and p95 at most 25ms over a 60-second benchmark on the recorded reference Mac, with at most 90 draw calls and 150k visible triangles.

#### Scenario: Combat effects and frame budget verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** the scripted benchmark loops through placement, view changes and shot effects
- **THEN** the report records measured frame times, draw calls, triangles, GPU/browser details and quality transitions
