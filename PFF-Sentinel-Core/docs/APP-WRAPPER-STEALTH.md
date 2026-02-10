# App-Wrapper Engine — Stealth Mode (System Privileges)

The **Interceptor** (Process Monitor) must run with **system privileges** so it cannot be bypassed by standard user permissions (e.g. a user killing the monitor or disabling it).

## Options

### 1. Run Process Monitor as Administrator (minimum)

- Right-click `services/process-monitor.js` → Run with Node as **Administrator**, or:
- From an elevated Command Prompt / PowerShell:
  ```bash
  cd PFF-Sentinel-Core
  node services/process-monitor.js
  ```
- Process suspension (`Suspend-Process` / `Resume-Process`) requires elevated rights to suspend processes of the same or other users.

### 2. Install as a Windows Service (Stealth Mode)

To run the Process Monitor with **LOCAL SYSTEM** privileges so standard users cannot stop it:

1. Use **node-windows** (or similar) to install the monitor as a Windows Service:
   ```bash
   npm install node-windows
   ```
2. Create a small wrapper script that:
   - Reads `config/sovereign-list.json`
   - Runs the same polling + suspend/notify/release logic as `process-monitor.js`
   - Is installed as a service so it starts at boot and runs as **Local System**.

3. Example (pseudo-code for service install):
   ```js
   const Service = require('node-windows').Service;
   const svc = new Service({
     name: 'PFF Sentinel Process Monitor',
     description: 'App-Wrapper: intercept protected app launches',
     script: path.join(__dirname, 'process-monitor.js'),
   });
   svc.on('install', () => svc.start());
   svc.install();
   ```

4. After installation, the service runs with **SYSTEM** privileges. Standard users cannot stop or uninstall it without admin rights.

### 3. Group Policy / Kiosk (optional)

- Use Group Policy to prevent users from stopping services or killing processes.
- Run the Sentinel Desktop (Electron) in kiosk mode so the overlay cannot be closed by normal means.

## Summary

| Mode              | Privilege        | Bypass by standard user   |
|-------------------|------------------|----------------------------|
| Normal Node       | User             | Can kill process           |
| Run as Admin      | Administrator    | Requires admin to stop     |
| Windows Service   | LOCAL SYSTEM     | Cannot stop without admin  |

For **Stealth Mode**, install the Process Monitor as a Windows Service so the Interceptor runs with system privileges.
