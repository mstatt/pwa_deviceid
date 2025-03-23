# Device ID Viewer

A Progressive Web App (PWA) for viewing device identifiers and hardware information across different platforms.

## Overview

Device ID Viewer is a PWA that provides access to device-specific identifiers and hardware information. It works across mobile and desktop browsers, with enhanced capabilities when installed as a standalone app.

## Features

- **Device ID Detection**: Uses multiple methods to identify the most reliable device identifier available
- **Cross-Platform Support**: Works on Android, iOS, Windows, macOS, and Linux
- **Hardware Information**: Shows detailed device specifications including OS, browser, and screen details
- **Feature Detection**: Displays which device APIs are available on the current device
- **Offline Support**: Full functionality available without internet access
- **Privacy-First**: All processing happens on-device with no data transmitted to servers

## How It Works

The app uses a cascading approach to device identification:

1. Native device IDs (via platform bridges)
   - Android ID (for Android devices)
   - iOS Device ID (for iOS devices)
   - Device Serial (when available)

2. Web API device identifiers
   - Media Devices API
   - Client Hints API
   - Hardware information

3. Fallback identification
   - Hardware profile generation
   - Random identifier generation as last resort

## Technical Details

### Main Components

- **app.js**: Core application logic for retrieving and displaying device information
- **NativeDeviceIdRetriever.js**: Class for accessing native device identifiers
- **index.html**: User interface with responsive design
- **service-worker.js**: Enables offline functionality and PWA features

### Key APIs Used

- **Native Bridges**: Android and iOS bridges for native device IDs
- **Media Devices API**: For accessing hardware-specific identifiers
- **Client Hints API**: For device model information
- **Hardware APIs**: Accessing device capabilities (CPU cores, memory, etc.)

## Installation

The app can be used directly in any modern browser or installed as a PWA for easier access:

1. Visit the app in a compatible browser
2. The browser should show an "Add to Home Screen" or "Install" prompt
3. Follow the prompts to install the app on your device

## Privacy Considerations

- All identifiers are processed locally and never transmitted
- The app works offline once installed
- No identifiers are stored beyond the current session
- No tracking or analytics are implemented

## Browser Compatibility

- Chrome (desktop and mobile)
- Safari (desktop and mobile)
- Firefox (desktop and mobile)
- Edge

## License

© 2025 Device ID Viewer
