## Context

The Tools page already supports fastboot list, getvar all, flash, reboot, slot management, and fastbootd reboot. We now want to add the remaining fastboot commands supported by the fastboot-protocol crate and common OEM extensions while preserving existing logging conventions and guardrails for MediaTek devices.

## Goals / Non-Goals

**Goals:**
- Add fastboot single-variable queries for quick checks.
- Add fastboot erase with explicit confirmation and logging.

**Non-Goals:**
- Implement fastboot boot (unsupported on MTK).
- Introduce new dependencies or change the fastboot transport layer.
- Add device-specific flashing wizards or OEM unlock flows.

## Decisions

- **Return parsed output to the UI while still logging raw output.**
  - Rationale: users need structured info and raw logs for support; both should be available.
  - Alternatives: only log raw output; rejected due to UX requirements.
- **Guard destructive actions with confirmation and device selection checks.**
  - Rationale: erase is irreversible and should require deliberate confirmation.
  - Alternatives: rely on backend errors only; rejected for safety.

## Risks / Trade-offs

- **Erase misuse** → Require explicit confirmation and show partition name in prompt.

## Migration Plan

- Add new backend commands and API wrappers with no changes to existing commands.
- Add UI panels for getvar single and erase.
- Rollback by removing the new commands and UI sections.

## Open Questions

- Should getvar single include a curated dropdown of common variables or only a free-text input?
