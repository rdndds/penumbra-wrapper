## Context

The app currently ships with a dark Zinc palette and Tailwind utility classes defined in `src/index.css` and component className strings. There is no theme switcher or persisted theme preference. We need to introduce a light theme that works across shared components and pages while fitting the existing styling conventions.

## Goals / Non-Goals

**Goals:**
- Provide a light mode theme that preserves contrast and hierarchy across core UI surfaces.
- Add a user-facing theme toggle and persist the choice across launches.
- Keep theme selection centralized in a store so components can respond consistently.

**Non-Goals:**
- Rebranding the app or redesigning layouts beyond theme tokens.
- Full OS-level theme synchronization or dynamic auto-switching.
- Replacing Tailwind with a different styling system.

## Decisions

- Use CSS variables to define light and dark color tokens, applied at the root (e.g., `data-theme` on `html` or `body`). This minimizes changes in component markup and keeps Tailwind usage consistent.
  - Alternative: duplicate Tailwind class lists per component. Rejected due to high maintenance and risk of drift.
- Add a theme preference field to the existing UI/settings store and persist to local storage (or existing settings persistence utility if present). This keeps preference management in one place and avoids prop-drilling.
  - Alternative: store only in local component state. Rejected because the preference must be global and persistent.
- Introduce a simple toggle control in the most appropriate settings surface (or header if settings page is not available). The control updates the store and immediately applies the theme.
  - Alternative: command palette only. Rejected because theme switching should be discoverable.

## Risks / Trade-offs

- Some components may rely on dark-only colors, leading to low contrast in light mode → Audit shared components and add token-based colors where needed.
- Tailwind utility usage could conflict with variable-driven theming in a few spots → Prefer tokenized classes and add small utilities to bridge gaps.
- Persisted theme mismatch on first render could cause a flash of wrong theme → Apply theme class/attribute as early as possible in app bootstrap.

## Migration Plan

- Add light theme tokens and root theme switching in `src/index.css`.
- Add theme preference to store and persistence layer.
- Update primary surfaces and shared components to use tokens rather than hard-coded dark colors.
- Introduce the UI toggle and verify persistence across restarts.

## Open Questions

- Where is the most appropriate UI location for the theme toggle in this app (settings page vs. header/tool menu)?
- Should the default be dark or based on system preference?
