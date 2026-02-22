## Purpose

Define refined light-mode tokens for surfaces, text hierarchy, and accent colors to ensure clear visual hierarchy and contrast.

## Requirements

### Requirement: Light mode surface ladder
The application SHALL define distinct light-mode tokens for background, surface, surface-alt, surface-hover, and border to ensure visible separation between UI layers.

#### Scenario: Light mode surface contrast
- **WHEN** light mode is active
- **THEN** primary surfaces (background, panels, inputs) are visually distinguishable without relying on hover states

### Requirement: Light mode text hierarchy
The application MUST provide light-mode text tokens for primary, muted, and subtle text that preserve readable hierarchy on light backgrounds.

#### Scenario: Light mode text hierarchy
- **WHEN** light mode is active
- **THEN** primary text is clearly more prominent than muted and subtle text

### Requirement: Light-safe accent tokens
The application SHALL define light-mode accent tokens for primary, secondary, success, warning, and danger, including hover and soft background variants.

#### Scenario: Accent usage in light mode
- **WHEN** light mode is active
- **THEN** accent-filled buttons and status indicators maintain legible contrast without appearing overly saturated

### Requirement: Consistent token application
The application MUST apply the refined light-mode tokens to core UI surfaces including navigation, tables, modals, forms, and panels.

#### Scenario: Core surfaces use tokens
- **WHEN** light mode is active
- **THEN** core UI surfaces render using the refined light-mode tokens consistently across pages
