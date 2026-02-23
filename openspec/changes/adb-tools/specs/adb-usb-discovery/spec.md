## ADDED Requirements

### Requirement: USB ADB device discovery
The system SHALL enumerate ADB devices connected over USB.

#### Scenario: Devices present
- **WHEN** USB ADB devices are connected
- **THEN** the system lists each device for selection

#### Scenario: No devices present
- **WHEN** no USB ADB devices are detected
- **THEN** the UI indicates that no devices are available

### Requirement: Device selection
The system SHALL allow selecting a single USB ADB device for operations.

#### Scenario: User selects a device
- **WHEN** the user selects a device from the list
- **THEN** subsequent ADB actions target the selected device

### Requirement: Authorization check
The system SHALL provide a USB ADB authorization check action.

#### Scenario: Authorization succeeds
- **WHEN** the user runs the authorization check
- **THEN** the system reports success

#### Scenario: Authorization fails
- **WHEN** the device is not authorized or key setup fails
- **THEN** the system reports guidance to enable USB debugging and accept the prompt
