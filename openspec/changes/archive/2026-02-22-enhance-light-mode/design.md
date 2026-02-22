## Context

Light mode currently uses a minimal set of tokens where multiple surfaces collapse into the same value, producing low contrast and weak visual hierarchy. We need to refine the light palette and ensure consistent application across navigation, tables, modals, forms, and panels without altering the established dark theme look.

## Goals / Non-Goals

**Goals:**
- Establish a clearer light-mode surface ladder (background, surface, surface-alt, hover, border).
- Add explicit accent tokens for primary/secondary and status states that are light-safe.
- Apply token usage consistently to core UI surfaces to improve readability and scanability.

**Non-Goals:**
- Rebranding the UI or changing layout/typography.
- Redesigning component structure or introducing a new theming system.
- Automatic system theme detection (unless already planned elsewhere).

## Decisions

- Use a token ladder for light mode with distinct values for `--bg`, `--surface`, `--surface-alt`, `--surface-hover`, and `--border` to restore depth and separation.
  - Alternative: rely on shadows only. Rejected because borders are already used throughout and need clear contrast on light backgrounds.
- Introduce explicit accent tokens (primary, secondary/accent, success, warning, danger) with soft background variants for chips/badges.
  - Alternative: keep hard-coded Tailwind colors. Rejected because they are tuned for dark mode and cause over-saturation in light mode.
- Apply token usage selectively to high-visibility surfaces first (sidebar, headers, tables, modals), then extend to forms and secondary panels to reduce risk of regressions.
  - Alternative: global sweep all components at once. Rejected to avoid over-scoping and allow focused visual QA.

## Risks / Trade-offs

- Risk: token updates cause unintended contrast issues in less-used components → Mitigation: add a visual QA checklist and verify key flows.
- Risk: accent changes reduce brand presence → Mitigation: keep hue families, adjust only light-mode saturation/brightness.
- Risk: inconsistent token usage creates mixed surfaces → Mitigation: audit top-level containers and shared components first.

## Migration Plan

- Update light mode token definitions in `src/index.css`.
- Add accent tokens and soft variants; update core UI surfaces to use them.
- Perform visual QA sweep on Dashboard, Flasher, Tools, and modals.

## Open Questions

- Should light mode default be neutral or slightly warm to reduce glare?
- Do we want to tone down purple accent usage in light mode or keep it for brand identity?
