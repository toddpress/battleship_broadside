# Visualization Specification

## Requirements

### Requirement: Interactive naval battlefield
The frontend SHALL render an interactive 3D ocean and 10x10 targeting grid using Three.js.

#### Scenario: Aim and fire
- **WHEN** an active player selects a tile on their turn
- **THEN** that coordinate is displayed and the Fire button becomes available

### Requirement: Waiting experience
An unpaired player SHALL see an animated radar-themed waiting screen until matched.
