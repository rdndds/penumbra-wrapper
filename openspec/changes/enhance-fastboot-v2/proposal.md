## Why

Fastboot tooling currently exposes only a subset of common commands, forcing manual CLI usage for routine maintenance on MediaTek devices. Adding the remaining supported commands improves coverage and safety by keeping workflows inside the app with consistent logging and guardrails.

## What Changes

- Add fastboot single-variable queries for targeted checks.
- Add fastboot erase operations with confirmations and logs.

## Capabilities

### New Capabilities
- `fastboot-getvar-single`: query a single fastboot variable and surface structured output.
- `fastboot-erase`: erase a named partition with safety confirmation and clear status logging.

### Modified Capabilities


## Impact

- Tauri fastboot command set and API wrapper additions.
- Tools page UI additions for new fastboot actions and outputs.
- Operation logging and toasts for new fastboot commands.
