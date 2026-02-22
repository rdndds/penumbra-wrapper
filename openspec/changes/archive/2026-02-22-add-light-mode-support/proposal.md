## Why

Users working in bright environments or during daytime hours need a light theme option to reduce eye strain and improve readability. Adding light mode now aligns the app with expected theming flexibility in modern desktop tools.

## What Changes

- Add a light theme variant that complements the existing dark Zinc palette.
- Provide a user-facing setting to toggle between light and dark modes, with a sensible default.
- Persist the selected theme across app launches.
- Ensure core UI surfaces and shared components render correctly in light mode.

## Capabilities

### New Capabilities
- `light-theme`: Define and expose a light mode theme for the app UI with user-controlled selection and persistence.

### Modified Capabilities

## Impact

- UI styling in `src/index.css`, shared components in `src/components/`, and page layouts in `src/pages/`.
- Theme state in `src/store/` and any settings-related hooks.
- Potential updates to design tokens, Tailwind utilities, and any theme-aware assets.
