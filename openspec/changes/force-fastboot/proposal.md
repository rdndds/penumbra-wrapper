## Why

Users need a reliable way to force MediaTek devices into Fastboot when normal reboot paths fail. Adding a first-class Fastboot forcing tool in the app reduces manual tooling and improves recovery workflows.

## What Changes

- Add a backend command to force MTK devices into Fastboot via serial preloader handshake.
- Stream status logs to the frontend and surface a status toast.
- Add a new Tools section with a “Force Fastboot” button.

## Capabilities

### New Capabilities
- `force-fastboot`: Force an MTK device into Fastboot mode with live status feedback.

### Modified Capabilities

## Impact

- Tauri commands in `src-tauri/src/commands/` and serial-port handling dependencies.
- Frontend Tools UI and API layer for invoking the new command.
- Logging/toast flow for status feedback.
