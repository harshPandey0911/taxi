// Spoof User Agent for WebView containers to prevent payment gateways (PhonePe/Razorpay)
// from hiding UPI intent options.
try {
  const ua = navigator.userAgent;
  if (/; wv\)/i.test(ua) || /Version\/[\d.]+/i.test(ua)) {
    window.__isRydon24WebView = true;
    const spoofedUa = ua
      .replace(/; wv\)/g, '')
      .replace(/Version\/[\d.]+\s*/g, '');
    
    Object.defineProperty(navigator, 'userAgent', {
      get: function () {
        return spoofedUa;
      },
      configurable: true,
    });
    
    Object.defineProperty(navigator, 'appVersion', {
      get: function () {
        return spoofedUa;
      },
      configurable: true,
    });

    console.info('[UA Spoofing] Successfully removed WebView identifiers to enable UPI apps.');
  }
} catch (e) {
  console.error('[UA Spoofing] Failed to override userAgent property:', e);
}

if (typeof window !== 'undefined') {
  window.__pendingNativeFcmCalls = Array.isArray(window.__pendingNativeFcmCalls)
    ? window.__pendingNativeFcmCalls
    : [];

  if (typeof window.__saveNativeFcmToken !== 'function') {
    const queueNativeFcmCall = (tokenOrPayload, role, platform = 'android') => {
      const payload =
        typeof tokenOrPayload === 'object' && tokenOrPayload !== null
          ? tokenOrPayload
          : { token: tokenOrPayload, role, platform };

      window.__pendingNativeFcmCalls.push(payload);
      return { ok: false, reason: 'bridge-not-ready' };
    };

    window.__saveNativeFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.__setNativeFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.setNativeFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.onNativeFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.onFcmTokenReceived = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.saveFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
    window.setFcmToken = (token, role, platform = 'android') => {
      return queueNativeFcmCall(token, role, platform);
    };
  }
}

import { createRoot } from 'react-dom/client'
import './index.css'
import { installLegacyBackendShim } from './shared/api/legacyBackendShim'
import { installBrowserFcmRegistration } from './shared/push/browserFcmRegistration'
import { installNativeFcmBridge } from './shared/push/nativeFcmBridge'
import App from './App.jsx'

installLegacyBackendShim()
installBrowserFcmRegistration()
installNativeFcmBridge()

createRoot(document.getElementById('root')).render(
  <App />,
)

