// Main app functionality for Device ID Viewer PWA

// DOM elements
const deviceIdElement = document.getElementById('device-id');
const idSourceElement = document.getElementById('id-source');
const copyButton = document.getElementById('copy-button');
const copyNotification = document.getElementById('copy-notification');
const refreshButton = document.getElementById('refresh-button');
const spinner = document.getElementById('spinner');
const deviceIdContainer = document.getElementById('device-id-container');

// Device details elements
const deviceTypeElement = document.getElementById('device-type');
const deviceOsElement = document.getElementById('device-os');
const deviceBrowserElement = document.getElementById('device-browser');
const deviceScreenElement = document.getElementById('device-screen');
const apiSupportGrid = document.getElementById('api-support-grid');

// Function to retrieve and display the device ID
async function retrieveDeviceId() {
  showLoading(true);
  
  // Get device ID from native APIs when available
  let deviceId = null;
  let source = 'unknown';
  
  try {
    // Try Android-specific method
    if (typeof Android !== 'undefined' && Android && Android.getAndroidId) {
      deviceId = Android.getAndroidId();
      source = 'android_id';
    } 
    // Try iOS-specific method
    else if (typeof window.webkit !== 'undefined' && window.webkit.messageHandlers && window.webkit.messageHandlers.iosDeviceId) {
      // Set up callback for iOS bridge
      const iosIdPromise = new Promise((resolve) => {
        window.iosDeviceIdCallback = function(id) {
          resolve(id);
          delete window.iosDeviceIdCallback;
        };
        
        // Request the iOS device ID
        window.webkit.messageHandlers.iosDeviceId.postMessage("getDeviceId");
        
        // Set timeout in case the callback isn't called
        setTimeout(() => {
          if (window.iosDeviceIdCallback) {
            delete window.iosDeviceIdCallback;
            resolve(null);
          }
        }, 1000);
      });
      
      deviceId = await iosIdPromise;
      if (deviceId) {
        source = 'ios_identifier';
      }
    }
    
    // If no native ID available, try device media IDs (hardware identifiers)
    if (!deviceId && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        // Try to get permission (might be denied)
        await navigator.mediaDevices.getUserMedia({ audio: true })
          .catch(() => {}); // Continue even if permission denied
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        // Filter to only get real device IDs (not "default" or "communications")
        const deviceIds = devices
          .filter(device => device.deviceId && device.deviceId !== "default" && device.deviceId !== "communications")
          .map(device => device.deviceId);
        
        if (deviceIds.length > 0) {
          deviceId = deviceIds[0]; // Use the first hardware device ID
          source = 'media_device';
        }
      } catch (err) {
        console.warn("Media devices access error:", err);
      }
    }
    
    // Try client hints for device model
    if (!deviceId && navigator.userAgentData) {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        if (hints.model) {
          deviceId = hints.model;
          source = 'client_hints';
        }
      } catch (err) {
        console.warn("Client hints access error:", err);
      }
    }
    
    // Last resort: create a hardware profile ID
    if (!deviceId) {
      const hardwareComponents = [];
      
      // Add available hardware info
      if (navigator.hardwareConcurrency) {
        hardwareComponents.push(`cores-${navigator.hardwareConcurrency}`);
      }
      if (navigator.deviceMemory) {
        hardwareComponents.push(`mem-${navigator.deviceMemory}`);
      }
      if (screen.width && screen.height) {
        hardwareComponents.push(`scr-${screen.width}x${screen.height}`);
      }
      if (navigator.platform) {
        hardwareComponents.push(`plat-${navigator.platform}`);
      }
      if (navigator.language) {
        hardwareComponents.push(`lang-${navigator.language}`);
      }
      
      // Only use if we have at least 3 components for a somewhat unique ID
      if (hardwareComponents.length >= 3) {
        deviceId = hardwareComponents.join('_');
        source = 'hardware_info';
      } else {
        // Ultimate fallback: generate a random ID but mark it as not device-specific
        deviceId = `fallback-${Math.random().toString(36).substring(2, 15)}`;
        source = 'fallback_generated';
      }
    }
    
    // Display the retrieved device ID
    displayDeviceId(deviceId, source);
    
    // Also get basic device info
    const deviceInfo = getDeviceInfo();
    displayDeviceInfo(deviceInfo);
    
  } catch (error) {
    console.error("Error retrieving device ID:", error);
    deviceIdElement.textContent = "Error retrieving device ID";
    idSourceElement.textContent = "Error";
    idSourceElement.className = "tag error";
  } finally {
    showLoading(false);
  }
}

// Show/hide loading spinner
function showLoading(isLoading) {
  if (isLoading) {
    spinner.classList.remove('hidden');
    deviceIdContainer.classList.add('hidden');
  } else {
    spinner.classList.add('hidden');
    deviceIdContainer.classList.remove('hidden');
  }
}

// Display the device ID with source info
function displayDeviceId(id, source) {
  if (!id) {
    deviceIdElement.textContent = "No device ID available";
    return;
  }
  
  // Format for readability if needed
  let displayId = id;
  if (id.length > 8 && !id.includes('-') && !id.includes('_')) {
    displayId = id.match(/.{1,4}/g).join('-'); 
  }
  
  deviceIdElement.textContent = displayId;
  
  // Show ID source
  const sourceLabels = {
    'android_id': 'Android ID',
    'ios_identifier': 'iOS Device ID',
    'media_device': 'Hardware ID',
    'client_hints': 'Device Model',
    'hardware_info': 'Hardware Profile',
    'fallback_generated': 'Generated ID',
    'unknown': 'Unknown Source'
  };
  
  idSourceElement.textContent = sourceLabels[source] || source;
  idSourceElement.className = 'tag ' + source;
}

// Get basic device information
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let deviceType = 'desktop';
  
  // Detect device type
  if (/mobi/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk|android(?!.*mobi)/i.test(ua)) {
    deviceType = 'tablet';
  }
  
  // Detect OS
  let os = 'unknown';
  let osVersion = '';
  
  if (/windows/i.test(ua)) {
    os = 'Windows';
    osVersion = ua.match(/Windows NT (\d+\.\d+)/) ? 
      (ua.match(/Windows NT (\d+\.\d+)/)[1] === '10.0' ? '10' : ua.match(/Windows NT (\d+\.\d+)/)[1]) : '';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    osVersion = ua.match(/Android (\d+(\.\d+)*)/) ? ua.match(/Android (\d+(\.\d+)*)/)[1] : '';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
    osVersion = ua.match(/OS (\d+[_\.]\d+[_\.]\d+)/) ? 
      ua.match(/OS (\d+[_\.]\d+[_\.]\d+)/)[1].replace(/_/g, '.') : '';
  } else if (/mac/i.test(ua)) {
    os = 'macOS';
    osVersion = ua.match(/Mac OS X (\d+[_\.]\d+[_\.]\d+)/) ? 
      ua.match(/Mac OS X (\d+[_\.]\d+[_\.]\d+)/)[1].replace(/_/g, '.') : '';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }
  
  // Detect browser
  let browser = 'unknown';
  let browserVersion = '';
  
  if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
    browserVersion = ua.match(/Edge\/(\d+\.\d+)/) ? ua.match(/Edge\/(\d+\.\d+)/)[1] : 
      ua.match(/Edg\/(\d+\.\d+)/) ? ua.match(/Edg\/(\d+\.\d+)/)[1] : '';
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/) ? ua.match(/Firefox\/(\d+\.\d+)/)[1] : '';
  } else if (/chrome/i.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/) ? ua.match(/Chrome\/(\d+\.\d+)/)[1] : '';
  } else if (/safari/i.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+\.\d+)/) ? ua.match(/Version\/(\d+\.\d+)/)[1] : '';
  } else if (/trident|msie/i.test(ua)) {
    browser = 'Internet Explorer';
    browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/) ? ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)[1] : '';
  }
  
  return {
    type: deviceType,
    os: {
      name: os,
      version: osVersion
    },
    browser: {
      name: browser,
      version: browserVersion
    },
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio || 1
    }
  };
}

// Display device information
function displayDeviceInfo(info) {
  if (!info) return;
  
  // Capitalize first letter of device type
  deviceTypeElement.textContent = info.type.charAt(0).toUpperCase() + info.type.slice(1);
  
  // Display OS information
  deviceOsElement.textContent = `${info.os.name} ${info.os.version}`;
  
  // Display browser information
  deviceBrowserElement.textContent = `${info.browser.name} ${info.browser.version}`;
  
  // Display screen information
  deviceScreenElement.textContent = `${info.screen.width}×${info.screen.height} (${info.screen.pixelRatio}x)`;
}

// Check which device ID APIs are supported
function checkSupportedApis() {
  const apis = {
    androidId: typeof Android !== 'undefined' && Android && Android.getAndroidId,
    deviceSerial: typeof Android !== 'undefined' && Android && Android.getDeviceSerial,
    iosIdentifier: typeof window.webkit !== 'undefined' && window.webkit.messageHandlers && window.webkit.messageHandlers.iosDeviceId,
    clientInformation: !!navigator.userAgentData,
    deviceMemory: 'deviceMemory' in navigator,
    hardwareConcurrency: 'hardwareConcurrency' in navigator,
    mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
    bluetooth: 'bluetooth' in navigator,
    usb: 'usb' in navigator,
    hid: 'hid' in navigator
  };
  
  displaySupportedApis(apis);
  return apis;
}

// Display supported API information
function displaySupportedApis(apis) {
  if (!apiSupportGrid) return;
  
  // Clear existing content
  apiSupportGrid.innerHTML = '';
  
  // User-friendly API names
  const apiNames = {
    androidId: 'Android ID',
    deviceSerial: 'Device Serial',
    iosIdentifier: 'iOS Device ID',
    clientInformation: 'Device Info API',
    deviceMemory: 'Memory API',
    hardwareConcurrency: 'CPU Cores API',
    mediaDevices: 'Media Devices API',
    bluetooth: 'Bluetooth API',
    usb: 'USB API',
    hid: 'HID API'
  };
  
  // Create an indicator for each API
  for (const [api, supported] of Object.entries(apis)) {
    const apiName = apiNames[api] || api;
    
    const apiItem = document.createElement('div');
    apiItem.className = `api-item ${supported ? 'supported' : 'unsupported'}`;
    
    const apiIcon = document.createElement('span');
    apiIcon.className = 'api-icon';
    apiIcon.innerHTML = supported ? 
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' :
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    
    const apiLabel = document.createElement('span');
    apiLabel.className = 'api-label';
    apiLabel.textContent = apiName;
    
    apiItem.appendChild(apiIcon);
    apiItem.appendChild(apiLabel);
    apiSupportGrid.appendChild(apiItem);
  }
}

// Copy device ID to clipboard
function copyToClipboard() {
  const textToCopy = deviceIdElement.textContent;
  
  if (!textToCopy || textToCopy === 'No device ID available' || textToCopy === 'Error retrieving device ID') {
    return;
  }
  
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      showCopyNotification();
    } catch (err) {
      console.error('Fallback: Could not copy text: ', err);
    }
    
    document.body.removeChild(textArea);
    return;
  }
  
  // Modern approach
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      showCopyNotification();
    })
    .catch(err => {
      console.error('Could not copy text: ', err);
    });
}

// Show "Copied!" notification
function showCopyNotification() {
  copyNotification.classList.remove('hidden');
  copyNotification.classList.add('show');
  
  setTimeout(() => {
    copyNotification.classList.remove('show');
    setTimeout(() => {
      copyNotification.classList.add('hidden');
    }, 300);
  }, 2000);
}

// Initialize the app
function init() {
  retrieveDeviceId();
  checkSupportedApis();
  
  // Set up event listeners
  copyButton.addEventListener('click', copyToClipboard);
  refreshButton.addEventListener('click', retrieveDeviceId);
  
  // Check for install capability
  window.addEventListener('beforeinstallprompt', (e) => {
    // Store the event for later use
    window.deferredPrompt = e;
  });
}

// Start the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
