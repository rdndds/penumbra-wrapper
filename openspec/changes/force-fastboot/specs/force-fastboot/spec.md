## ADDED Requirements

### Requirement: Force fastboot command
The application MUST provide a backend command that attempts to switch an MTK device into Fastboot mode using a serial preloader handshake.

#### Scenario: Successful fastboot handshake
- **WHEN** a compatible MTK device is connected and the handshake succeeds
- **THEN** the command reports success and indicates the device should be in Fastboot mode

#### Scenario: Device not detected
- **WHEN** no compatible MTK preloader device is detected within the scan window
- **THEN** the command reports a no-device status

#### Scenario: Port open failure
- **WHEN** candidate ports are detected but cannot be opened
- **THEN** the command reports an open-error status and suggests checking permissions

#### Scenario: Handshake timeout
- **WHEN** a compatible MTK device is detected but no ACK is received within the attempt window
- **THEN** the command reports a no-ack status

### Requirement: Status feedback
The application SHALL emit status updates during the force-fastboot attempt so the frontend can surface progress to the user.

#### Scenario: Status events emitted
- **WHEN** the force-fastboot command starts, retries, or completes
- **THEN** the backend emits status events describing the current state

### Requirement: Frontend invocation
The application MUST expose a frontend-invokable API for triggering force-fastboot from the Tools UI.

#### Scenario: User clicks Force Fastboot
- **WHEN** the user clicks the Force Fastboot button
- **THEN** the application invokes the backend command and shows status toasts
