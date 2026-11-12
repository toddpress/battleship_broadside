# Gameplay Specification

## Requirements

### Requirement: Battleship rules
The game SHALL use a 10x10 grid and ships of lengths 5, 4, 3, 3, 2, placed without overlap.

#### Scenario: Legal shot
- **WHEN** a player takes their turn by firing at an untried in-bounds coordinate
- **THEN** the server records the hit or miss and advances the turn unless the match ends

#### Scenario: Illegal shot
- **WHEN** a player shoots out of turn or repeats a target
- **THEN** the server rejects the shot without changing the match

### Requirement: Fleet secrecy
The server SHALL NOT expose opposing fleet locations before a match has ended.

#### Scenario: Public synchronization
- **WHEN** the GunDB match record is updated
- **THEN** it contains only match status, turn, revision, winner and last-shot information
