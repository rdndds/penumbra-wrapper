## 1. Backend fastboot commands

- [x] 1.1 Add a fastboot command for setting active slot (a/b)
- [x] 1.2 Add a fastboot command for rebooting to fastbootd with compatibility handling
- [x] 1.3 Wire new commands into the Tauri command registry and API service layer

## 2. Device info parsing

- [x] 2.1 Parse `getvar all` output into structured key/value data in the frontend
- [x] 2.2 Preserve unparsed lines as raw output for display
- [x] 2.3 Map key fields (product, serial, current-slot, unlocked) into a device info model

## 3. Tools UI and guardrails

- [x] 3.1 Add a Fastboot Device Info panel with refresh action
- [x] 3.2 Add slot management controls with disabled states for non-A/B devices
- [x] 3.3 Add fastbootd reboot action and surface compatibility errors
- [x] 3.4 Add preflight guidance when no fastboot device is detected

## 4. Logging and feedback

- [x] 4.1 Ensure fastboot slot and fastbootd actions log to the operation log panel
- [x] 4.2 Add success and failure toasts for new fastboot actions

## 5. Verification

- [ ] 5.1 Manually verify getvar parsing and panel rendering with sample output
- [ ] 5.2 Verify slot actions are blocked on devices without `current-slot`
- [ ] 5.3 Verify fastbootd reboot handling on unsupported devices surfaces guidance
