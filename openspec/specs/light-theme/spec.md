## Purpose

Define the application's theme selection behavior and baseline theme tokens for core UI surfaces.

## Requirements

### Requirement: Theme selection
The application SHALL allow the user to switch between light and dark themes from a visible UI control.

#### Scenario: User selects light theme
- **WHEN** the user activates the light theme option
- **THEN** the application applies the light theme to the UI immediately

#### Scenario: User selects dark theme
- **WHEN** the user activates the dark theme option
- **THEN** the application applies the dark theme to the UI immediately

### Requirement: Theme persistence
The application MUST persist the user-selected theme across application restarts.

#### Scenario: Theme persists after restart
- **WHEN** the user selects a theme and restarts the application
- **THEN** the application loads with the previously selected theme

### Requirement: Theme tokens
The application SHALL define light and dark theme tokens for core UI surfaces, including background, surface, text, and borders.

#### Scenario: Light theme token usage
- **WHEN** the light theme is active
- **THEN** core UI surfaces render using the light theme tokens

#### Scenario: Dark theme token usage
- **WHEN** the dark theme is active
- **THEN** core UI surfaces render using the dark theme tokens

### Requirement: Default theme behavior
The application MUST define a deterministic default theme when no prior selection exists.

#### Scenario: No saved preference
- **WHEN** the application starts without a stored theme preference
- **THEN** the application applies the default theme
