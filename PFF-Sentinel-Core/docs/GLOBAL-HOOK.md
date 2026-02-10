# Global Hook — Input Interception (Lock State)

While the Sentinel is in **Locked** state, the requirement is to disable system shortcut keys **system-wide**:

- **Alt+Tab** (task switch)
- **Alt+F4** (close window)
- **Ctrl+Shift+Esc** (Task Manager)
- **Windows Key** (Start Menu)

## Why This Can't Be Done in the Browser or Electron Alone

- **Browser**: Cannot intercept or block OS-level shortcuts; this would be a security violation.
- **Electron**: Can block shortcuts **inside** the Electron window (e.g. prevent Alt+F4 from closing the app), but cannot block **Alt+Tab**, **Windows Key**, or **Ctrl+Shift+Esc** because the OS handles these before they reach the app.

## Solution: Native Helper Process

To achieve true **global** blocking, you need a small **native** process that installs a **low-level keyboard hook** on Windows:

1. **SetWindowsHookEx(WH_KEYBOARD_LL, ...)** — hooks all keyboard input system-wide.
2. The hook runs in a separate process (or DLL) that must stay running while the Sentinel is locked.
3. When the Sentinel sends "Lock" (e.g. via a local socket or file), the helper enables the hook and swallows the target keys; when "Unlock" is sent, the hook is removed.

### Option A: C# Console App (Windows)

- Use `SetWindowsHookEx` with `WH_KEYBOARD_LL` from `user32.dll`.
- Run as a separate process; communicate with the Sentinel via a named pipe, file, or TCP socket (e.g. write `pff_lock_state` or use the same BroadcastChannel concept from a small local server).

### Option B: C++ / Node Native Addon

- Build a Node addon (e.g. `node-gyp`) that calls `SetWindowsHookEx` and exports `enableHook()` / `disableHook()`.
- The Electron main process would load this addon and call it when lock state changes (main process receives lock state from renderer via IPC).

### Option C: Pre-built Executable

- Ship a small `pff-global-hook.exe` that:
  - Reads a flag file (e.g. same as `pff_lock_state` in userData) or listens on a port.
  - When lock is active, installs the hook; when inactive, removes it.
- The Sentinel Desktop (Electron) or Watchdog starts this helper when the app starts and stops it on exit.

## Current Behavior (Without Native Helper)

- **In-window**: The lock overlay already blocks **all** keyboard and mouse input **outside** the unlock panel (capture-phase `preventDefault`). So keys typed in the lock screen do nothing except inside the panel.
- **Electron**: You can extend the main process to **ignore** Alt+F4 and similar for the Sentinel window (e.g. `mainWindow.setIgnoreMouseEvents` or shortcut filters) so that closing the window is harder; the Watchdog will still relaunch if the process is killed.

## Summary

| Shortcut        | In-window (current)     | System-wide (needs native helper) |
|----------------|--------------------------|-----------------------------------|
| Alt+Tab        | Cannot block in JS      | SetWindowsHookEx(WH_KEYBOARD_LL)  |
| Alt+F4         | Can block in Electron    | Optional: same hook               |
| Ctrl+Shift+Esc | Cannot block in JS      | Same hook                         |
| Windows Key    | Cannot block in JS      | Same hook                         |

Implement the native helper according to your deployment (C#, C++, or Node addon) and have the Sentinel Desktop or Watchdog start/stop it when lock state changes.
