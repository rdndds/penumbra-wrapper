## Context

The app currently provides fastboot tooling but lacks integrated ADB workflows. Users rely on external ADB CLI for shell access, file transfer, package installs, and system actions. We need USB-only ADB support with consistent logging, toasts, and progress, aligned with existing operation streaming patterns.

## Goals / Non-Goals

**Goals:**
- Implement USB-only ADB device discovery and selection.
- Provide an ADB authorization check for USB trust status.
- Provide single-command shell actions.
- Provide file list/stat/push/pull with progress, logs, and toasts.
- Provide package install/uninstall and system actions (reboot/root/remount/verity).
- Save framebuffer screenshots to the existing Antumbra output directory.

**Non-Goals:**
- TCP or mDNS ADB discovery.
- Multiple concurrent transfers.
- In-app screenshot preview (disk-only save).

## Decisions

- **USB-only `adb_client` feature set.**
  - Rationale: matches user requirement and limits surface area.
  - Alternatives: enable TCP/mDNS; rejected due to scope and security concerns.
- **Authorization check via simple shell command.**
  - Rationale: validates trust without introducing new transport logic.
- **Single transfer enforcement in backend and UI.**
  - Rationale: avoids concurrency issues and simplifies UX.
  - Alternatives: queue or parallel operations; deferred for future.
- **Progress reporting via operation streaming.**
  - Rationale: reuse existing log panel and toast patterns; progress events can be surfaced by operation IDs.
  - Alternatives: separate progress channel; rejected to keep integration consistent.
- **Screenshot output path matches Antumbra output directory.**
  - Rationale: consistency with existing export flows and user expectations.

## Risks / Trade-offs

- **ADB authorization failures** → Provide clear error messages and guidance.
- **Large transfers** → Stream progress and prevent concurrent transfers.
- **Large transfers** → Stream progress and prevent concurrent transfers.

## Migration Plan

- Add new backend commands and API layer without altering existing fastboot flows.
- Add ADB Tools section to the Tools page with USB-only device selector.
- Rollback by removing new commands and UI panel.

## Open Questions

- Confirm the exact Antumbra output directory path to use for framebuffer saves.
