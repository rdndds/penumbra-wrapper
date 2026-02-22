## Why

Fastboot mode currently offers only basic operations, which makes routine device inspection and slot management slower and error-prone. Adding focused fastboot tooling now reduces support friction and enables safer, more guided operations directly from the Tools page.

## What Changes

- Add a structured Fastboot Device Info view that parses and presents `getvar all` output.
- Add slot management actions (query current slot, set active slot) with guardrails.
- Add reboot extensions for fastbootd where supported.
- Add preflight checks and UX guidance for fastboot-only operations.

## Capabilities

### New Capabilities
- `fastboot-device-info`: surface parsed device metadata from `getvar all` in a consistent UI panel.
- `fastboot-slot-management`: read current slot and set active slot with validation and clear logging.
- `fastboot-reboot-extensions`: expose additional reboot targets (fastbootd) with compatibility handling.

### Modified Capabilities


## Impact

- Frontend Tools page UI/UX for fastboot panels and action flows.
- Tauri fastboot commands and API service layer for new operations.
- Operation logging and toasts for fastboot-specific preflight and results.
