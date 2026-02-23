## ADDED Requirements

### Requirement: Single shell command
The system SHALL run a single ADB shell command and return its output.

#### Scenario: Command succeeds
- **WHEN** the user runs a shell command
- **THEN** the system logs stdout/stderr and reports success

#### Scenario: Command fails
- **WHEN** the command execution fails
- **THEN** the system reports the error and logs failure output

 
