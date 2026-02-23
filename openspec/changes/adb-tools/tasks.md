## 1. Backend ADB USB setup

- [x] 1.1 Add `adb_client` dependency with USB feature only
- [x] 1.2 Implement USB ADB device discovery and selection commands
- [x] 1.3 Create standard adb key when missing and use it for USB connections
- [x] 1.4 Add ADB authorization check command
- [x] 1.5 Add file list/stat/push/pull commands with progress streaming
- [x] 1.6 Add package install/uninstall commands
- [x] 1.7 Add system action commands (reboot/root/remount/verity)
- [x] 1.8 Add framebuffer save-to-disk command using Antumbra output dir

## 2. API layer and types

- [x] 2.1 Add frontend API wrappers for all ADB commands
- [x] 2.2 Add progress event typing for transfers

## 3. Tools UI

- [x] 3.1 Add ADB Tools section with USB device selector
- [x] 3.2 Implement shell panel (single command)
- [x] 3.3 Add ADB authorization check button
- [x] 3.4 Implement file tools panel with progress bars
- [x] 3.5 Implement package tools panel (install/uninstall)
- [x] 3.6 Implement system actions panel (reboot/root/remount/verity)
- [x] 3.7 Implement screenshot save control (disk only)

## 4. Concurrency guardrails

- [x] 4.1 Enforce single active transfer in UI and backend

## 5. Logging, toasts, and verification

- [x] 5.1 Ensure all ADB actions stream logs to the operation panel
- [x] 5.2 Add success/failure toasts for all ADB actions
- [ ] 5.3 Verify USB discovery, shell, transfers, packages, system actions, screenshot save
