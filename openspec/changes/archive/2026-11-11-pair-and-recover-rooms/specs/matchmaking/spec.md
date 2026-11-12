## MODIFIED Requirements

### Requirement: Automatic FIFO pairing
The authority SHALL pair each entrant with the oldest eligible waiting room, with at most two seats. The first entrant SHALL see animated waiting. The second SHALL advance both participants to placement.

#### Scenario: Automatic FIFO pairing verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** three independent entrants join concurrently
- **THEN** two share one placement room and the third occupies a separate waiting room

#### Scenario: Odd man waiting
- **WHEN** a player joins an empty queue
- **THEN** they see an animated waiting screen and cannot place or fire

#### Scenario: A second player joins
- **WHEN** another entrant joins while that room is eligible
- **THEN** both seats enter placement and a room revision hint is published

#### Scenario: Three players join
- **WHEN** a third player joins after the first pair
- **THEN** the third waits in a separate room until a fourth joins

### Requirement: Expiration and departure
The server SHALL apply the 30-second absence and 90-second expiry rules using server time. Explicit departure SHALL close waiting or placement and SHALL forfeit active combat. An expired combat seat SHALL forfeit only if the other seat is present.

#### Scenario: Inactive player expires
- **WHEN** an unpaired or placement seat reaches 90 seconds without contact
- **THEN** the room closes and releases its credentials

#### Scenario: One expired combat seat
- **WHEN** an active combat participant's lease reaches 90 seconds while the opponent is present
- **THEN** the opponent wins by forfeit and new shots are rejected

#### Scenario: Both seats absent at expiry
- **WHEN** a combat participant's lease reaches 90 seconds while the other seat is already absent
- **THEN** the room closes without declaring a winner and neither credential can revive it

## ADDED Requirements

### Requirement: Reconnect and notification recovery
The server SHALL publish a Gun hint containing only a room-specific revision counter on an unguessable per-room topic. The client SHALL obtain its topic and authoritative state via the authenticated API. Duplicate, stale, forged or lost hints SHALL only affect refresh scheduling. Authenticated polling SHALL converge without Gun, and transient failures SHALL preserve the session credential.

#### Scenario: Reconnect and notification recovery verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a player loses connectivity and returns before expiry while Gun delivery is unavailable
- **THEN** polling restores the same seat, phase and shot history without replaying old shots
