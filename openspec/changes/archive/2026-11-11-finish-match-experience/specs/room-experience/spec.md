## ADDED Requirements

### Requirement: Participant chat
The server SHALL accept bounded plain-text chat from paired participants only, store at most 50 messages, and expose messages only via authorized snapshots. The UI SHALL preserve focus during refresh and render chat content as text.

#### Scenario: Participant chat verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a participant sends markup-like text while the other is typing
- **THEN** the other sees literal characters and keeps focus and their unsent draft

### Requirement: Rematch and visible connection state
A finished room SHALL offer rematch and leave. A new round SHALL start only when both present seats consent. The HUD SHALL distinguish opponent absence, transport retry, and confirmed session expiration.

#### Scenario: Rematch and visible connection state verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** both players vote while connected after a finished match
- **THEN** the server issues a new match ID, resets the round, and returns both players to placement
