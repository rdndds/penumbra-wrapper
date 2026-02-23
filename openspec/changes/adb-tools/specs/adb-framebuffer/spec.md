## ADDED Requirements

### Requirement: Save framebuffer screenshot
The system SHALL save a framebuffer screenshot to the Antumbra output directory.

#### Scenario: Screenshot save succeeds
- **WHEN** the user triggers a screenshot capture
- **THEN** the system writes a PNG file to the Antumbra output directory and reports success

#### Scenario: Screenshot save fails
- **WHEN** the screenshot capture fails
- **THEN** the system logs the error and reports failure
