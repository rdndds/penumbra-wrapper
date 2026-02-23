## ADDED Requirements

### Requirement: System actions
The system SHALL provide ADB system actions including reboot, root, remount, and verity enable/disable.

#### Scenario: Action succeeds
- **WHEN** a system action completes successfully
- **THEN** the system logs the action and shows a success toast

#### Scenario: Action fails
- **WHEN** a system action fails
- **THEN** the system logs the error and shows a failure toast
