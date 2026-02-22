## ADDED Requirements

### Requirement: Current slot detection
The system SHALL determine the current active slot when A/B support is present.

#### Scenario: A/B device reports current slot
- **WHEN** `getvar all` includes `current-slot`
- **THEN** the system displays the current slot value

#### Scenario: Non-A/B device
- **WHEN** `current-slot` is not available
- **THEN** the system disables slot actions and explains that slots are unsupported

### Requirement: Set active slot
The system SHALL allow setting the active slot to `a` or `b` on supported devices.

#### Scenario: Set slot succeeds
- **WHEN** the user selects slot `a` or `b` and the command succeeds
- **THEN** the system logs the change and updates the displayed current slot

#### Scenario: Set slot fails
- **WHEN** the command fails due to device rejection or transport errors
- **THEN** the system reports the error and leaves the active slot unchanged

### Requirement: Preflight guardrails
The system SHALL require a connected fastboot device before slot actions are enabled.

#### Scenario: No fastboot device connected
- **WHEN** no fastboot device is detected
- **THEN** the slot action controls are disabled with guidance to enter fastboot
