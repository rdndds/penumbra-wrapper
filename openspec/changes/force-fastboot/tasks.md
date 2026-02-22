## 1. Backend Command

- [x] 1.1 Add serialport dependency and implement MTK force-fastboot handshake logic
- [x] 1.2 Add Tauri command that emits status events and returns final status

## 2. Frontend Integration

- [x] 2.1 Add API wrapper to invoke the force-fastboot command and listen for status events
- [x] 2.2 Add a new Tools section with a Force Fastboot button and status toasts

## 3. QA and Messaging

- [x] 3.1 Add Linux permission warning messaging for port open failures
- [ ] 3.2 Verify status toasts for success, no-device, no-ack, and open-error cases
