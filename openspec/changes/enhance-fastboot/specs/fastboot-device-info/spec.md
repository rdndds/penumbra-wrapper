## ADDED Requirements

### Requirement: Parse getvar output
The system SHALL parse `getvar all` output into structured key/value fields for display.

#### Scenario: Successful parse
- **WHEN** `getvar all` returns a list of variables
- **THEN** the system extracts keys and values into a structured model

#### Scenario: Unknown or malformed lines
- **WHEN** a line cannot be parsed into a key/value pair
- **THEN** the system preserves it in a raw output section

### Requirement: Device info panel
The system SHALL render a device info panel showing key fastboot properties from parsed data.

#### Scenario: Populated info panel
- **WHEN** parsed data includes device identifiers and slot state
- **THEN** the panel displays product, serial, current slot, and unlocked state when present

### Requirement: Refresh from getvar
The system SHALL refresh the device info panel using the latest `getvar all` output.

#### Scenario: User refreshes device info
- **WHEN** the user triggers a refresh action
- **THEN** the panel updates with the latest parsed values and raw output
