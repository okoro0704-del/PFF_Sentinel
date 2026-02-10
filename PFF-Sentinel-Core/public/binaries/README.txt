═══════════════════════════════════════════════════════════════════════════════
  PFF SENTINEL DESKTOP SUITE - INSTALLATION GUIDE
═══════════════════════════════════════════════════════════════════════════════

Welcome to the Sentinel Desktop Suite! This bundle includes everything you need
to set up hardware-backed biometric authentication on your desktop.

═══════════════════════════════════════════════════════════════════════════════
  WHAT'S INCLUDED
═══════════════════════════════════════════════════════════════════════════════

1. ZKBioOnline Service (Hardware Bridge)
   - Connects ZKTeco fingerprint scanners to your browser
   - Runs as a background service on localhost:8088 (WebSocket) and :8089 (HTTP)

2. ZKTeco USB Drivers
   - Official drivers for ZKTeco fingerprint scanner hardware
   - Supports Windows 10/11 (64-bit)

3. This README.txt
   - 3-step setup guide

═══════════════════════════════════════════════════════════════════════════════
  3-STEP SETUP GUIDE
═══════════════════════════════════════════════════════════════════════════════

STEP 1: Install ZKTeco USB Drivers
───────────────────────────────────────────────────────────────────────────────
1. Locate the "ZKTeco_Drivers" folder in this bundle
2. Run "ZKTeco_USB_Driver_Setup.exe" as Administrator
3. Follow the installation wizard (accept defaults)
4. Restart your computer when prompted

STEP 2: Install ZKBioOnline Service (Hardware Bridge)
───────────────────────────────────────────────────────────────────────────────
1. Locate the "ZKBioOnline" folder in this bundle
2. Run "ZKBioOnline_Setup.exe" as Administrator
3. Follow the installation wizard:
   - Install Location: C:\Program Files\ZKBioOnline (default)
   - Service Mode: Install as Windows Service (recommended)
   - Ports: 8088 (WebSocket), 8089 (HTTP) - DO NOT CHANGE
4. Click "Install" and wait for completion
5. The service will start automatically

STEP 3: Verify Installation
───────────────────────────────────────────────────────────────────────────────
1. Connect your ZKTeco fingerprint scanner via USB
2. Open the Sentinel Protocol web dashboard (localhost or your deployment URL)
3. Navigate to the Download page
4. Check the "Hardware Status" section:
   - If you see "✓ Hardware Online" - SUCCESS! You're ready to scan.
   - If you see "⚠ Hardware Offline" - See troubleshooting below.

═══════════════════════════════════════════════════════════════════════════════
  TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════════

Problem: "Hardware Offline" after installation
───────────────────────────────────────────────────────────────────────────────
Solution:
1. Check if ZKBioOnline service is running:
   - Press Win+R, type "services.msc", press Enter
   - Look for "ZKBioOnline Service"
   - Status should be "Running"
   - If not, right-click → Start

2. Verify USB connection:
   - Unplug and replug the fingerprint scanner
   - Check Device Manager (Win+X → Device Manager)
   - Look under "Biometric Devices" or "USB Devices"
   - Should see "ZKTeco Fingerprint Reader"

3. Check firewall:
   - Windows Firewall may block localhost:8088 and :8089
   - Add exception for ZKBioOnline.exe

4. Restart the service:
   - Open Command Prompt as Administrator
   - Run: net stop ZKBioOnline
   - Run: net start ZKBioOnline

Problem: Driver installation fails
───────────────────────────────────────────────────────────────────────────────
Solution:
1. Disable Driver Signature Enforcement (Windows 10/11):
   - Restart PC
   - Hold Shift while clicking "Restart"
   - Choose: Troubleshoot → Advanced Options → Startup Settings → Restart
   - Press F7 to disable driver signature enforcement
   - Install drivers again

2. Run as Administrator:
   - Right-click driver installer → "Run as administrator"

═══════════════════════════════════════════════════════════════════════════════
  TECHNICAL DETAILS
═══════════════════════════════════════════════════════════════════════════════

ZKBioOnline Service Ports:
- WebSocket: ws://localhost:8088
- HTTP API:  http://localhost:8089

The Sentinel Protocol dashboard automatically detects the hardware bridge
by attempting to connect to both ports. No manual configuration needed.

═══════════════════════════════════════════════════════════════════════════════
  SUPPORT
═══════════════════════════════════════════════════════════════════════════════

For technical support, visit:
- Documentation: /docs/DOWNLOAD-PORTAL.md
- Hardware Status: Open Sentinel Protocol → Download page
- ZKTeco Support: https://www.zkteco.com/support

═══════════════════════════════════════════════════════════════════════════════
  SECURITY NOTICE
═══════════════════════════════════════════════════════════════════════════════

The ZKBioOnline service runs on localhost only and is NOT accessible from
external networks. Your biometric data never leaves your device.

All fingerprint templates are stored locally using WebAuthn and encrypted
in your browser's secure storage.

═══════════════════════════════════════════════════════════════════════════════

Thank you for using PFF Sentinel Protocol!

═══════════════════════════════════════════════════════════════════════════════

