## Why

The current light mode palette lacks contrast and clear hierarchy, making surfaces and text harder to parse in bright environments. Improving the light theme now will reduce visual fatigue, improve readability, and align the UI with expected daylight usability.

## What Changes

- Refine light mode color tokens to improve surface separation, border visibility, and text hierarchy.
- Introduce light-safe accent tokens for primary/secondary/success/warning/danger states.
- Apply updated tokens consistently across core UI surfaces (navigation, tables, modals, forms, and panels).

## Capabilities

### New Capabilities
- `light-theme-tokens`: Define a refined light mode token set with clear surface, border, text, and accent scales.

### Modified Capabilities

## Impact

- Theme tokens in `src/index.css` and any theme-related utilities.
- Component styling across `src/components/` and `src/pages/` that rely on surface and accent colors.
- Potential adjustments to status colors and button variants to ensure light-mode contrast.
