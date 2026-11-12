# Matchmaking Specification

## Requirements

### Requirement: Automatic FIFO pairing
The system SHALL enqueue an unpaired player and SHALL pair the two oldest active players into a single match.

#### Scenario: Odd man waiting
- **WHEN** one player joins with no other waiting player
- **THEN** the player sees a waiting screen, without a playable match

#### Scenario: A second player joins
- **WHEN** a second player joins while one is waiting
- **THEN** the server pairs the two players and publishes a match revision through GunDB

#### Scenario: Three players join
- **WHEN** a third player joins after the first pair
- **THEN** the third player remains queued until a fourth joins

### Requirement: Expiration and departure
Players SHALL heartbeat, and stale sessions SHALL expire; a mid-match departure SHALL award a win to the other player.
