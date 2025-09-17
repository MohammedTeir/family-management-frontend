// Session recovery utilities
import { apiGet } from './axios-api';
import { recoverSession as axiosRecoverSession } from './axios-interceptors';

// Enable debug mode for session issues
localStorage.setItem('debug-api', 'true');

export async function attemptSessionRecovery(): Promise<boolean> {
  console.log('🔄 Attempting session recovery with axios...');
  
  try {
    // Use axios-based session recovery
    return await axiosRecoverSession();
  } catch (error) {
    console.log('❌ Axios session recovery failed, trying manual approach...');
    
    try {
      // Fallback to manual session check
      await apiGet('/api/user');
      console.log('✅ Manual session recovery successful');
      return true;
    } catch (manualError) {
      console.log('❌ Manual session recovery failed:', manualError);
      return false;
    }
  }
}

export function clearAllCookies() {
  console.log('🍪 Clearing all cookies...');
  
  // Clear all cookies
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
}

export function debugSessionInfo() {
  console.log('🔍 Session Debug Info:', {
    currentUrl: window.location.href,
    cookies: document.cookie || 'none',
    localStorage: Object.keys(localStorage),
    sessionStorage: Object.keys(sessionStorage),
    userAgent: navigator.userAgent,
    referrer: document.referrer || 'none'
  });
}

// Auto-debug on load
debugSessionInfo();