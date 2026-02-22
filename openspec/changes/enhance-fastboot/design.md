## Context

The Tools page already includes fastboot operations (device list, getvar all, flash, reboot) backed by a Tauri fastboot API. However, the output is largely unstructured and lacks guardrails for common fastboot workflows like slot management or fastbootd transitions. We want to add richer device metadata presentation and safe, guided operations while preserving current logging conventions and API boundaries.

## Goals / Non-Goals

**Goals:**
- Provide a structured Fastboot Device Info panel sourced from `getvar all`.
- Add slot management actions (read current slot, set active slot) with clear validation and logging.
- Add reboot support for fastbootd where supported, with compatibility handling.
- Add preflight checks and UX guidance to reduce incorrect fastboot usage.

**Non-Goals:**
- Replacing the existing fastboot API layer or logging system.
- Implementing OEM unlock/lock flows or device-specific flashing wizards.
- Adding background fastboot polling or hotplug detection.

## Decisions

- **Parse `getvar all` into a typed model in the frontend.**
  - Rationale: keeps backend changes minimal and leverages existing log output; enables flexible UI without expanding backend surface area.
  - Alternatives: parse in Rust and return structured JSON; rejected to avoid expanding the Tauri API and to keep `getvar all` logging raw.
- **Introduce discrete fastboot commands for slot actions and fastbootd reboot.**
  - Rationale: clear operational boundaries, aligns with current command-per-action pattern.
  - Alternatives: reuse existing reboot command with modes for slot management; rejected as it conflates semantics and complicates error handling.
- **Guardrails in UI before destructive actions.**
  - Rationale: user mistakes are more common in fastboot workflows; a preflight checklist improves safety.
  - Alternatives: rely on backend validation only; rejected because UX clarity is critical.

## Risks / Trade-offs

- **Device variance in fastboot vars** → Parse defensively and show unknown keys in a raw section.
- **fastbootd support is inconsistent** → Detect via error handling and surface a clear compatibility message.
- **Slot actions on non-A/B devices** → Check for `has-slot` or `current-slot` markers and disable actions with explanation.

## Migration Plan

- Add new backend commands and API wrappers behind the existing Tools page.
- Ship UI changes behind the current Fastboot Tools section without altering existing flows.
- No data migration required; rollback by removing the new commands and UI panel.

## Open Questions

- Should we surface raw `getvar all` output alongside the parsed view by default or behind a toggle?
