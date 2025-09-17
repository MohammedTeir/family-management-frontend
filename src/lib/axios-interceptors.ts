import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { primaryApi, fallbackApi, corsApi } from './axios-api';

// Retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx errors
    return !error.response || 
           error.code === 'ECONNABORTED' ||
           error.code === 'ERR_NETWORK' ||
           (error.response.status >= 500 && error.response.status <= 599);
  }
};

// Add retry functionality to axios instance
const addRetryInterceptor = (instance: any, config: RetryConfig = defaultRetryConfig) => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const { config: originalConfig } = error;
      
      if (!originalConfig || !(originalConfig as any).__retryCount) {
        (originalConfig as any).__retryCount = 0;
      }

      const shouldRetry = config.retryCondition(error) && 
                         (originalConfig as any).__retryCount < config.retries;

      if (shouldRetry) {
        (originalConfig as any).__retryCount += 1;
        
        console.log(`🔄 Retrying request (attempt ${(originalConfig as any).__retryCount}/${config.retries}):`, {
          url: originalConfig?.url,
          method: originalConfig?.method,
          error: error.message,
          status: error.response?.status
        });

        // Exponential backoff delay
        const delay = config.retryDelay * Math.pow(2, (originalConfig as any).__retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        return instance.request(originalConfig);
      }

      return Promise.reject(error);
    }
  );
};

// Request interceptor for debugging and session management
const addRequestInterceptor = (instance: any, instanceName: string) => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Add timestamp for debugging
      (config as any).__timestamp = Date.now();
      
      // Ensure cookies are included for session management
      if (config.withCredentials) {
        config.headers = config.headers || {};
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        
        // Add current origin for CORS
        if (typeof window !== 'undefined') {
          config.headers['Origin'] = window.location.origin;
        }
      }

      if (import.meta.env.DEV || localStorage.getItem('debug-api')) {
        console.log(`📤 ${instanceName} Request:`, {
          url: config.url,
          method: config.method?.toUpperCase(),
          withCredentials: config.withCredentials,
          headers: config.headers,
          timestamp: new Date((config as any).__timestamp).toISOString()
        });
      }

      return config;
    },
    (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
};

// Response interceptor for debugging and session handling
const addResponseInterceptor = (instance: any, instanceName: string) => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const duration = Date.now() - (response.config as any).__timestamp;
      
      if (import.meta.env.DEV || localStorage.getItem('debug-api')) {
        console.log(`📥 ${instanceName} Response:`, {
          url: response.config.url,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          cookies: document.cookie || 'none'
        });
      }

      // Check for session-related headers
      if (response.headers['set-cookie']) {
        console.log('🍪 Session cookie set:', response.headers['set-cookie']);
      }

      return response;
    },
    (error: AxiosError) => {
      const duration = error.config ? Date.now() - (error.config as any).__timestamp : 0;
      
      if (import.meta.env.DEV || localStorage.getItem('debug-api')) {
        console.log(`❌ ${instanceName} Error:`, {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          duration: `${duration}ms`,
          cookies: document.cookie || 'none'
        });
      }

      // Handle specific session errors
      if (error.response?.status === 401) {
        console.log('🔒 Authentication required - session may have expired');
        
        // Emit custom event for auth error handling
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth-error', { 
            detail: { error, response: error.response } 
          }));
        }
      }

      return Promise.reject(error);
    }
  );
};

// Session recovery interceptor
const addSessionRecoveryInterceptor = (instance: any) => {
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalConfig = error.config;
      
      if (error.response?.status === 401 && 
          originalConfig && 
          !(originalConfig as any).__sessionRetried) {
        
        (originalConfig as any).__sessionRetried = true;
        
        console.log('🔄 Attempting session recovery...');
        
        try {
          // Try to refresh session by making a simple request
          await instance.get('/api/user');
          console.log('✅ Session recovery successful, retrying original request');
          
          // Retry original request
          return instance.request(originalConfig);
        } catch (recoveryError) {
          console.log('❌ Session recovery failed');
          
          // Clear any cached auth data
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Initialize all interceptors
export const setupAxiosInterceptors = () => {
  console.log('🔧 Setting up axios interceptors...');
  
  // Setup interceptors for primary API
  addRequestInterceptor(primaryApi, 'Primary');
  addResponseInterceptor(primaryApi, 'Primary');
  addRetryInterceptor(primaryApi);
  addSessionRecoveryInterceptor(primaryApi);
  
  // Setup interceptors for fallback API
  addRequestInterceptor(fallbackApi, 'Fallback');
  addResponseInterceptor(fallbackApi, 'Fallback');
  addRetryInterceptor(fallbackApi);
  
  // Setup interceptors for CORS API
  addRequestInterceptor(corsApi, 'CORS');
  addResponseInterceptor(corsApi, 'CORS');
  addRetryInterceptor(corsApi);
  
  console.log('✅ Axios interceptors configured successfully');
};

// Manual session recovery function
export const recoverSession = async (): Promise<boolean> => {
  try {
    console.log('🔄 Manual session recovery attempt...');
    await primaryApi.get('/api/user');
    console.log('✅ Manual session recovery successful');
    return true;
  } catch (error) {
    console.log('❌ Manual session recovery failed:', error);
    return false;
  }
};

// Clear all session data
export const clearSession = () => {
  console.log('🧹 Clearing session data...');
  
  // Clear cookies
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('✅ Session data cleared');
};

// Auto-initialize interceptors
setupAxiosInterceptors();