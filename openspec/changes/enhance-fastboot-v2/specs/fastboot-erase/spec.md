## ADDED Requirements

### Requirement: Erase partition
The system SHALL allow erasing a named partition over fastboot.

#### Scenario: Erase succeeds
- **WHEN** the user confirms the erase and the device accepts the command
- **THEN** the system logs success and reports completion

#### Scenario: Erase fails
- **WHEN** the device rejects the erase or a transport error occurs
- **THEN** the system reports the error and logs the failure

### Requirement: Confirmation guardrail
The system SHALL require explicit user confirmation before erasing a partition.

#### Scenario: User cancels erase
- **WHEN** the user declines the confirmation prompt
- **THEN** the erase command is not sent and the UI reports cancellation
