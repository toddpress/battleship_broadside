# Gameplay Specification

## Purpose

Define Battleship placement, combat and participant-visible game information.

## Requirements

### Requirement: Battleship rules
The game SHALL use a 10×10 board and fleets of lengths 5, 4, 3, 3, 2. Ships MAY touch but SHALL NOT overlap. Combat SHALL begin after both legal fleets are locked. Each turn SHALL accept one previously untried in-bounds shot, advancing on hits and misses unless it ends the game. The last required hit SHALL record the winner and stop combat.

#### Scenario: Battleship rules verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** both players lock legal fleets and the current shooter hits the final intact enemy cell
- **THEN** the authority records the sink and winner and rejects subsequent shots

#### Scenario: Legal shot
- **WHEN** the current player fires at an untried in-bounds coordinate
- **THEN** the server records hit or miss and advances the turn unless the match ends

#### Scenario: Illegal shot
- **WHEN** a player fires out of turn or repeats a target
- **THEN** the server rejects the shot without changing match revision

### Requirement: Fleet secrecy
The server SHALL reveal an enemy ship’s geometry only once all its cells have been hit. The placement client SHALL allow random or manual placement and SHALL identify invalid drafts before ready submission.

#### Scenario: Fleet secrecy verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a draft overlaps and a player attempts to lock it
- **THEN** the server returns an invalid-placement error, keeps readiness and phase unchanged, and publishes no hint or fleet cells

#### Scenario: Public synchronization
- **WHEN** the room notification is published
- **THEN** GunDB receives only the opaque topic revision without any shot or fleet data
