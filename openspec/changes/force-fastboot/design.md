## Context

The app currently provides device operations via Tauri commands but has no direct way to force MTK devices into Fastboot from the UI. A Python utility exists to perform a serial preloader handshake, and we need a native Rust implementation that works on Linux and Windows with live status feedback.

## Goals / Non-Goals

**Goals:**
- Implement a Rust backend command that attempts the MTK preloader handshake and reports status.
- Stream log/status events to the frontend for toast-based feedback.
- Add a new Tools section with a Force Fastboot button that triggers the command.

**Non-Goals:**
- Auto-installing udev rules or modifying system permissions.
- Exposing advanced tuning parameters in the UI.
- Supporting macOS at this time.

## Decisions

- Use the `serialport` crate for cross-platform serial enumeration and I/O.
  - Alternative: platform-specific APIs. Rejected for complexity and duplication.
- Emit Tauri events from the backend command for live status updates; the frontend will show only status toasts.
  - Alternative: return logs only after completion. Rejected because feedback during the preloader window is important.
- Use a two-phase handshake (flood writes then probe) mirroring the existing Python script.
  - Alternative: single-phase write/read loop. Rejected due to lower reliability in short preloader windows.

## Risks / Trade-offs

- Risk: serial permissions on Linux prevent opening ports → Mitigation: emit clear warning with udev rule guidance.
- Risk: preloader timing varies across devices → Mitigation: keep sensible defaults and fallback baud rates.
- Risk: noisy or ambiguous device responses → Mitigation: accept "READY" substring as success signal, log raw response for troubleshooting.

## Migration Plan

- Add new Tauri command and register it.
- Add serial dependency and implement handshake logic.
- Add frontend Tools section and API invocation; wire toast status updates.

## Open Questions

- Should we add an optional retry count beyond the default window?
