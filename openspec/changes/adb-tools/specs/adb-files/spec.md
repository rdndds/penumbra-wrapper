## ADDED Requirements

### Requirement: List and stat
The system SHALL list directory contents and fetch file stat information via ADB.

#### Scenario: List succeeds
- **WHEN** the user requests a directory listing
- **THEN** the system returns the item list and logs the result

#### Scenario: Stat succeeds
- **WHEN** the user requests file stat
- **THEN** the system returns the stat data and logs the result

### Requirement: Push and pull files
The system SHALL support ADB push and pull operations with progress reporting.

#### Scenario: Transfer succeeds
- **WHEN** the user starts a push or pull
- **THEN** the system reports progress and shows a success toast when complete

#### Scenario: Transfer fails
- **WHEN** a push or pull fails
- **THEN** the system logs the error and shows a failure toast

### Requirement: Single active transfer
The system SHALL allow only one active file transfer at a time.

#### Scenario: Transfer already active
- **WHEN** a transfer is in progress and another is requested
- **THEN** the system blocks the new transfer and reports that a transfer is active
