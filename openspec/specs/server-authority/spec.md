# server-authority Specification

## Purpose

Define participant authentication, private state projection, and atomic application of gameplay commands.

## Requirements

### Requirement: Participant snapshots
The server SHALL issue opaque server-generated credentials and authenticate participant snapshots and commands using a bearer header. A snapshot SHALL contain only the participant’s own fleet, both shot histories with permitted results, sunk enemy ships, and visible match metadata. Unhit enemy coordinates SHALL remain private even at termination.

#### Scenario: Participant snapshots verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a participant fetches a snapshot during combat or after a forfeit
- **THEN** the response contains no session credentials or unrevealed enemy fleet cells

### Requirement: Command serialization
The server SHALL validate phase, seat, match ID, and expected revision before applying a game mutation. The server SHALL retain the most recent 256 accepted ready/fire receipts per seat until round replacement or room cleanup. It SHALL compare command ID and canonical payload before checking expected revision. A matching ID with a different payload SHALL return 409. A duplicate accepted command SHALL return its original outcome without mutating state.

#### Scenario: Command serialization verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** two commands target the same revision, then the accepted command is retried
- **THEN** only one command commits and its retry returns the original outcome
