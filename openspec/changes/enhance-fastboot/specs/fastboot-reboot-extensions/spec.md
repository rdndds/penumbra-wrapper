## ADDED Requirements

### Requirement: Fastbootd reboot option
The system SHALL provide a fastboot reboot option for fastbootd where supported by the device.

#### Scenario: Reboot to fastbootd succeeds
- **WHEN** the user selects the fastbootd reboot option and the device supports it
- **THEN** the system initiates the reboot and reports success

#### Scenario: Fastbootd unsupported
- **WHEN** the device rejects the fastbootd reboot command
- **THEN** the system reports a compatibility message and does not retry automatically

### Requirement: Logging and user feedback
The system SHALL log the reboot action and surface a toast outcome for success or failure.

#### Scenario: Successful reboot action
- **WHEN** the reboot command completes successfully
- **THEN** the system logs completion and shows a success toast

#### Scenario: Failed reboot action
- **WHEN** the reboot command fails
- **THEN** the system logs the error and shows a failure toast
