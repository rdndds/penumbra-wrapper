## ADDED Requirements

### Requirement: Query single fastboot variable
The system SHALL allow querying a single fastboot variable by name.

#### Scenario: Variable query succeeds
- **WHEN** the user requests a known variable
- **THEN** the system returns the value and logs the response

#### Scenario: Variable query fails
- **WHEN** the device rejects the variable name or the command fails
- **THEN** the system reports the error and logs the failure

### Requirement: Display variable output
The system SHALL display the variable name and value in the fastboot UI.

#### Scenario: Output rendered
- **WHEN** a variable query completes successfully
- **THEN** the UI shows the variable and its value in a structured view
