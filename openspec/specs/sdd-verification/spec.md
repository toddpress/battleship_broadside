# sdd-verification Specification

## Purpose

Define evidence and independent review requirements for changing and verifying Broadside.

## Requirements

### Requirement: Independent review gates
The workflow SHALL run structural checks before a stateless local Goldfish review at spec, architecture and plan gates and after implementation for drift. It SHALL record explicitly enumerated input paths and their SHA-256 hashes. It SHALL record evidence anchors, severity, impact, recommendation and disposition, and SHALL require closure of material findings before advancing.

#### Scenario: Independent review gates verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** a review receives an artifact and explicitly enumerated references
- **THEN** Ollama receives only those files and the review rubric, and the result records input hashes and structured findings

### Requirement: Reproducible verification
The project SHALL record tests, hardware and commands for rules, privacy, concurrency, reconnect, chat, two-browser playthrough, rendering and resource lifecycle. Unexecuted checks SHALL be recorded as such.

#### Scenario: Reproducible verification verified
- **GIVEN** a Broadside session at the applicable phase
- **WHEN** the final change is proposed for archive
- **THEN** evidence maps approved requirements to actual code and test results and any outstanding criterion keeps the change active
