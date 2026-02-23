## Why

The app currently relies on fastboot and manual ADB usage for device maintenance. Adding USB-only ADB tools inside the app provides a safer, logged workflow with consistent UX and eliminates CLI dependency for common tasks.

## What Changes

- Add USB-only ADB device discovery and selection.
- Add ADB authorization check to confirm device trust and key setup.
- Add shell tools (single command) with streamed logs.
- Add file operations (list/stat/push/pull) with progress reporting.
- Add package operations (install/uninstall) and system actions (reboot/root/remount/verity).
- Add framebuffer screenshot save to disk using the existing Antumbra output directory.

## Capabilities

### New Capabilities
- `adb-usb-discovery`: enumerate USB ADB devices and allow device selection.
- `adb-auth-check`: verify USB authorization and key trust with a quick check.
- `adb-shell`: run shell commands with streaming output.
- `adb-files`: list/stat/push/pull files with progress, logs, and toasts.
- `adb-packages`: install and uninstall APKs with outcome reporting.
- `adb-system`: reboot, root, remount, and verity enable/disable actions.
- `adb-framebuffer`: save a framebuffer screenshot to the Antumbra output directory.

### Modified Capabilities


## Impact

- New Tauri ADB commands and API service wrappers (USB only).
- Tools page UI additions with progress indicators and logs.
- Operation logging and toasts for ADB actions.
