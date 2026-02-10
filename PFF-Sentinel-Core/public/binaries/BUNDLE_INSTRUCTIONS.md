# Sentinel Desktop Bundle - Assembly Instructions

## Overview

This directory should contain the **Sentinel_Desktop_Bundle.zip** file that includes:

1. **ZKBioOnline Service** (Hardware Bridge)
2. **ZKTeco USB Drivers**
3. **README.txt** (3-step setup guide)

## How to Create the Bundle

Since the actual ZKTeco binaries are proprietary and must be obtained from ZKTeco directly, follow these steps to create the bundle:

### Step 1: Obtain ZKTeco Software

Download the following from ZKTeco's official website or your hardware vendor:

1. **ZKBioOnline Service**
   - File: `ZKBioOnline_Setup.exe` or similar
   - Version: Latest stable release
   - Platform: Windows 10/11 (64-bit)

2. **ZKTeco USB Drivers**
   - File: `ZKTeco_USB_Driver_Setup.exe` or similar
   - Version: Compatible with your fingerprint scanner model
   - Platform: Windows 10/11 (64-bit)

### Step 2: Organize Files

Create the following folder structure:

```
Sentinel_Desktop_Bundle/
├── README.txt (already created in this directory)
├── ZKBioOnline/
│   └── ZKBioOnline_Setup.exe
└── ZKTeco_Drivers/
    └── ZKTeco_USB_Driver_Setup.exe
```

### Step 3: Create the ZIP Archive

1. Place all files in a folder named `Sentinel_Desktop_Bundle`
2. Right-click the folder → Send to → Compressed (zipped) folder
3. Rename to `Sentinel_Desktop_Bundle.zip`
4. Move the ZIP file to this directory (`public/binaries/`)

### Step 4: Update Download Links

The download page (`download.html`) is already configured to link to:
```
/binaries/Sentinel_Desktop_Bundle.zip
```

Once you place the ZIP file here, the download will work automatically.

## Alternative: Mock Bundle for Testing

If you want to test the download functionality without the actual binaries, create a mock bundle:

```powershell
# Create mock structure
New-Item -ItemType Directory -Path "Sentinel_Desktop_Bundle\ZKBioOnline" -Force
New-Item -ItemType Directory -Path "Sentinel_Desktop_Bundle\ZKTeco_Drivers" -Force

# Copy README
Copy-Item "README.txt" "Sentinel_Desktop_Bundle\"

# Create placeholder files
"Mock ZKBioOnline installer - Replace with actual ZKBioOnline_Setup.exe" | Out-File "Sentinel_Desktop_Bundle\ZKBioOnline\PLACEHOLDER.txt"
"Mock ZKTeco driver installer - Replace with actual ZKTeco_USB_Driver_Setup.exe" | Out-File "Sentinel_Desktop_Bundle\ZKTeco_Drivers\PLACEHOLDER.txt"

# Create ZIP
Compress-Archive -Path "Sentinel_Desktop_Bundle\*" -DestinationPath "Sentinel_Desktop_Bundle.zip" -Force

# Clean up
Remove-Item "Sentinel_Desktop_Bundle" -Recurse -Force
```

## File Size Expectations

- **ZKBioOnline Service**: ~50-100 MB
- **ZKTeco USB Drivers**: ~10-30 MB
- **Total Bundle Size**: ~60-130 MB

## Security Considerations

- Only include official ZKTeco software from verified sources
- Verify file hashes/signatures before bundling
- Keep the bundle updated with latest stable versions
- Document version numbers in README.txt

## Current Status

✅ README.txt created
⏳ Waiting for ZKTeco binaries
⏳ Bundle ZIP not yet created

Once you have the binaries, follow the steps above to create the bundle.

