/**
 * Native Device ID Retriever
 * 
 * This class focuses on retrieving native device identifiers rather than
 * generating synthetic ones. It uses various browser and device APIs to
 * access actual hardware identifiers when available and permitted.
 */
class NativeDeviceIdRetriever {
  constructor() {
    this.supportedApis = this.checkSupportedApis();
  }

  /**
   * Check which device ID APIs are supported in this browser/device
   */
  checkSupportedApis() {
    return {
      // Mobile device APIs
      androidId: typeof Android !== 'undefined' && Android && Android.getAndroidId,
      deviceSerial: typeof Android !== 'undefined' && Android && Android.getDeviceSerial,
      iosIdentifier: typeof webkit !== 'undefined' && webkit && webkit.messageHandlers && webkit.messageHandlers.iosDeviceId,
      
      // Standard Web APIs
      clientInformation: !!navigator.userAgentData,
      deviceMemory: 'deviceMemory' in navigator,
      hardwareConcurrency: 'hardwareConcurrency' in navigator,
      
      // WebRTC and related APIs
      mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      webRTC: !!(window.RTCPeerConnection),
      
      // Other hardware access APIs
      bluetooth: 'bluetooth' in navigator,
      usb: 'usb' in navigator,
      serial: 'serial' in navigator,
      hid: 'hid' in navigator,
      
      // Native capabilities
      credentialManagement: 'credentials' in navigator
    };
  }

  /**
   * Get the main device ID using the best available method
   * @returns {Promise<Object>} Object with deviceId and source
   */
  async getDeviceId() {
    try {
      // Try different methods in descending order of reliability
      
      // 1. Try Android native bridge if available
      if (this.supportedApis.androidId) {
        const androidId = await this.getAndroidId();
        if (androidId) {
          return {
            deviceId: androidId,
            source: 'android_id'
          };
        }
      }
      
      // 2. Try iOS native bridge if available
      if (this.supportedApis.iosIdentifier) {
        const iosId = await this.getIOSIdentifier();
        if (iosId) {
          return {
            deviceId: iosId,
            source: 'ios_identifier'
          };
        }
      }
      
      // 3. Try device serial if available through a bridge
      if (this.supportedApis.deviceSerial) {
        const serialId = await this.getDeviceSerial();
        if (serialId) {
          return {
            deviceId: serialId,
            source: 'device_serial'
          };
        }
      }
      
      // 4. Try WebRTC to get device IDs
      if (this.supportedApis.mediaDevices) {
        const mediaDeviceId = await this.getMediaDeviceId();
        if (mediaDeviceId) {
          return {
            deviceId: mediaDeviceId,
            source: 'media_device'
          };
        }
      }
      
      // 5. Fall back to Client Hints if available
      if (this.supportedApis.clientInformation) {
        const clientId = await this.getClientHints();
        if (clientId) {
          return {
            deviceId: clientId,
            source: 'client_hints'
          };
        }
      }
      
      // 6. Last resort: use hardware information
      const hardwareId = await this.getHardwareIdentifier();
      return {
        deviceId: hardwareId,
        source: 'hardware_info'
      };
    } catch (error) {
      console.error('Error retrieving device ID:', error);
      return {
        deviceId: this.generateFallbackId(),
        source: 'fallback_generated'
      };
    }
  }

  /**
   * Get Android ID through native bridge
   */
  async getAndroidId() {
    try {
      if (typeof Android !== 'undefined' && Android && Android.getAndroidId) {
        return Android.getAndroidId();
      }
      return null;
    } catch (error) {
      console.warn('Error accessing Android ID:', error);
      return null;
    }
  }

  /**
   * Get iOS Identifier through WebKit message handlers
   */
  async getIOSIdentifier() {
    return new Promise((resolve) => {
      try {
        if (typeof webkit !== 'undefined' && 
            webkit.messageHandlers && 
            webkit.messageHandlers.iosDeviceId) {
          // Set up a callback for the iOS bridge
          window.iosDeviceIdCallback = function(iosId) {
            resolve(iosId);
            delete window.iosDeviceIdCallback;
          };
          
          // Request the ID
          webkit.messageHandlers.iosDeviceId.postMessage("getDeviceId");
          
          // Set a timeout in case the callback isn't called
          setTimeout(() => {
            if (window.iosDeviceIdCallback) {
              delete window.iosDeviceIdCallback;
              resolve(null);
            }
          }, 1000);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.warn('Error accessing iOS identifier:', error);
        resolve(null);
      }
    });
  }

  /**
   * Get device serial through native bridge
   */
  async getDeviceSerial() {
    try {
      if (typeof Android !== 'undefined' && Android && Android.getDeviceSerial) {
        return Android.getDeviceSerial();
      }
      return null;
    } catch (error) {
      console.warn('Error accessing device serial:', error);
      return null;
    }
  }

  /**
   * Get media device IDs
   */
  async getMediaDeviceId() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return null;
      }
      
      // Request permission to access devices
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .catch(error => {
          console.warn('Media access denied:', error);
          // Continue even if permission denied
        });
      
      // Get device IDs
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter out devices with empty device IDs
      const deviceIds = devices
        .filter(device => device.deviceId && device.deviceId !== "default" && device.deviceId !== "communications")
        .map(device => device.deviceId);
      
      if (deviceIds.length > 0) {
        // Use the first non-empty ID
        // In most cases, the hardware device IDs are consistent
        return deviceIds[0];
      }
      
      return null;
    } catch (error) {
      console.warn('Error accessing media devices:', error);
      return null;
    }
  }

  /**
   * Get client hints information
   */
  async getClientHints() {
    try {
      if (!navigator.userAgentData) {
        return null;
      }
      
      // Get high-entropy values which may contain device information
      const hints = await navigator.userAgentData.getHighEntropyValues([
        'platform',
        'platformVersion',
        'architecture',
        'model',
        'uaFullVersion'
      ]);
      
      // If the model is available, it's often a good device identifier
      if (hints.model) {
        return hints.model;
      }
      
      // Otherwise combine platform details
      if (hints.platform && hints.platformVersion) {
        return `${hints.platform}-${hints.platformVersion}-${hints.architecture || ''}`;
      }
      
      return null;
    } catch (error) {
      console.warn('Error accessing client hints:', error);
      return null;
    }
  }

  /**
   * Get hardware information as identifier
   */
  async getHardwareIdentifier() {
    // Combine available hardware information
    const hardwareInfo = [];
    
    if (navigator.hardwareConcurrency) {
      hardwareInfo.push(`cores-${navigator.hardwareConcurrency}`);
    }
    
    if (navigator.deviceMemory) {
      hardwareInfo.push(`memory-${navigator.deviceMemory}`);
    }
    
    if (screen && screen.colorDepth) {
      hardwareInfo.push(`display-${screen.width}x${screen.height}x${screen.colorDepth}`);
    }
    
    if (navigator.connection && navigator.connection.effectiveType) {
      hardwareInfo.push(`network-${navigator.connection.effectiveType}`);
    }
    
    if (navigator.platform) {
      hardwareInfo.push(`platform-${navigator.platform}`);
    }
    
    // Create a composite ID from the hardware information
    if (hardwareInfo.length > 0) {
      return hardwareInfo.join('_');
    }
    
    // If no hardware info is available, return null
    return null;
  }

  /**
   * Generate a fallback ID if no device ID can be retrieved
   */
  generateFallbackId() {
    // Create a simple random ID
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestampPart = Date.now().toString(36);
    
    return `fallback-${randomPart}-${timestampPart}`;
  }

  /**
   * Get additional device information
   */
  async getDeviceInfo() {
    const info = {
      type: this.getDeviceType(),
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1
      }
    };
    
    // Add hardware information if available
    if (navigator.deviceMemory) {
      info.memory = navigator.deviceMemory;
    }
    
    if (navigator.hardwareConcurrency) {
      info.processors = navigator.hardwareConcurrency;
    }
    
    return info;
  }

  /**
   * Get device type (mobile, tablet, desktop)
   */
  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'unknown';
    let version = 'unknown';
    
    // Extract browser and version from user agent
    if (/firefox/i.test(userAgent)) {
      browser = 'Firefox';
      version = userAgent.match(/Firefox\/([\d.]+)/)[1];
    } else if (/chrome/i.test(userAgent) && /edge/i.test(userAgent)) {
      browser = 'Edge';
      version = userAgent.match(/Edge\/([\d.]+)/)[1];
    } else if (/chrome/i.test(userAgent) && /edg/i.test(userAgent)) {
      browser = 'Edge';
      version = userAgent.match(/Edg\/([\d.]+)/)[1];
    } else if (/chrome/i.test(userAgent) && /opr\//i.test(userAgent)) {
      browser = 'Opera';
      version = userAgent.match(/OPR\/([\d.]+)/)[1];
    } else if (/chrome/i.test(userAgent) && /chromium/i.test(userAgent)) {
      browser = 'Chromium';
      version = userAgent.match(/Chromium\/([\d.]+)/)[1];
    } else if (/chrome/i.test(userAgent)) {
      browser = 'Chrome';
      version = userAgent.match(/Chrome\/([\d.]+)/)[1];
    } else if (/safari/i.test(userAgent)) {
      browser = 'Safari';
      version = userAgent.match(/Version\/([\d.]+)/)[1];
    }
    
    return { name: browser, version: version };
  }

  /**
   * Get OS information
   */
  getOSInfo() {
    const userAgent = navigator.userAgent;
    let os = 'unknown';
    let version = 'unknown';
    
    // Extract OS and version from user agent
    if (/windows/i.test(userAgent)) {
      os = 'Windows';
      if (/windows nt 10/i.test(userAgent)) {
        version = '10';
      } else if (/windows nt 6.3/i.test(userAgent)) {
        version = '8.1';
      } else if (/windows nt 6.2/i.test(userAgent)) {
        version = '8';
      } else if (/windows nt 6.1/i.test(userAgent)) {
        version = '7';
      }
    } else if (/mac os x/i.test(userAgent)) {
      os = 'macOS';
      version = userAgent.match(/Mac OS X (\d+[._]\d+)/)[1].replace('_', '.');
    } else if (/android/i.test(userAgent)) {
      os = 'Android';
      version = userAgent.match(/Android (\d+(\.\d+)+)/)[1];
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = 'iOS';
      version = userAgent.match(/OS (\d+(_\d+)+)/)[1].replace(/_/g, '.');
    } else if (/linux/i.test(userAgent)) {
      os = 'Linux';
    }
    
    return { name: os, version: version };
  }
}

// Export for use in other modules
window.NativeDeviceIdRetriever = NativeDeviceIdRetriever;
