import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Multiple axios instances with different configurations for fallback
const createAxiosInstance = (config: AxiosRequestConfig): AxiosInstance => {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds
    ...config,
  });
};

// Primary axios instance with full credentials
export const primaryApi = createAxiosInstance({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Fallback instance with same-origin credentials
export const fallbackApi = createAxiosInstance({
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Alternative instance for CORS issues
export const corsApi = createAxiosInstance({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
  },
});

// Debug function
const debugRequest = (instance: string, config: AxiosRequestConfig) => {
  if (import.meta.env.DEV || localStorage.getItem('debug-api')) {
    console.log(`🔍 ${instance} Request:`, {
      url: config.url,
      method: config.method?.toUpperCase(),
      withCredentials: config.withCredentials,
      headers: config.headers,
      data: config.data ? '(has data)' : 'none',
      cookies: document.cookie || 'none'
    });
  }
};

const debugResponse = (instance: string, response: any, error?: any) => {
  if (import.meta.env.DEV || localStorage.getItem('debug-api')) {
    if (error) {
      console.log(`❌ ${instance} Error:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        cookies: document.cookie || 'none'
      });
    } else {
      console.log(`✅ ${instance} Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        cookies: document.cookie || 'none'
      });
    }
  }
};

// Enhanced request function with multiple fallback strategies
export const apiRequest = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  options?: AxiosRequestConfig
): Promise<any> => {
  const config: AxiosRequestConfig = {
    method,
    url,
    data,
    ...options,
  };

  // Strategy definitions
  const strategies = [
    {
      name: 'Primary (withCredentials: true)',
      instance: primaryApi,
      config: { ...config, withCredentials: true }
    },
    {
      name: 'CORS optimized',
      instance: corsApi,
      config: { 
        ...config, 
        withCredentials: true,
        headers: {
          ...config.headers,
          'Origin': window.location.origin,
        }
      }
    },
    {
      name: 'Fallback (withCredentials: false)',
      instance: fallbackApi,
      config: { ...config, withCredentials: false }
    },
    {
      name: 'Simple request',
      instance: primaryApi,
      config: { 
        ...config, 
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
        }
      }
    }
  ];

  let lastError: AxiosError | null = null;

  for (const strategy of strategies) {
    try {
      debugRequest(strategy.name, strategy.config);
      
      const response = await strategy.instance.request(strategy.config);
      
      debugResponse(strategy.name, response);
      
      if (strategy.name !== strategies[0].name) {
        console.log(`✅ ${strategy.name} strategy succeeded after primary failed`);
      }
      
      return response;
      
    } catch (error: any) {
      lastError = error;
      debugResponse(strategy.name, null, error);
      
      // Only try next strategy for specific error types
      if (error.response?.status === 401 || 
          error.response?.status === 403 ||
          error.code === 'ERR_NETWORK' ||
          error.message.includes('CORS') ||
          error.message.includes('credentials')) {
        
        console.log(`🔄 ${strategy.name} failed (${error.response?.status || error.code}), trying next strategy...`);
        continue;
      }
      
      // For other errors, don't try more strategies
      throw error;
    }
  }

  // If all strategies failed, throw the last error
  console.error('❌ All API strategies failed');
  throw lastError;
};

// Convenience methods
export const apiGet = (url: string, options?: AxiosRequestConfig) => 
  apiRequest('GET', url, undefined, options);

export const apiPost = (url: string, data?: any, options?: AxiosRequestConfig) => 
  apiRequest('POST', url, data, options);

export const apiPut = (url: string, data?: any, options?: AxiosRequestConfig) => 
  apiRequest('PUT', url, data, options);

export const apiDelete = (url: string, options?: AxiosRequestConfig) => 
  apiRequest('DELETE', url, undefined, options);

export const apiPatch = (url: string, data?: any, options?: AxiosRequestConfig) => 
  apiRequest('PATCH', url, data, options);

// Legacy compatibility function for existing fetchApi calls
export const fetchApi = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const method = (options?.method || 'GET') as any;
  const data = options?.body ? JSON.parse(options.body as string) : undefined;
  
  try {
    const axiosResponse = await apiRequest(method, endpoint, data);
    
    // Convert axios response to fetch Response-like object
    const response = {
      ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: new Map(Object.entries(axiosResponse.headers)),
      json: async () => axiosResponse.data,
      text: async () => JSON.stringify(axiosResponse.data),
    } as Response;
    
    return response;
  } catch (error: any) {
    // Convert axios error to fetch error
    const response = {
      ok: false,
      status: error.response?.status || 0,
      statusText: error.response?.statusText || error.message,
      headers: new Map(),
      json: async () => error.response?.data || {},
      text: async () => error.message,
    } as Response;
    
    return response;
  }
};

// Enable debugging by default for troubleshooting
localStorage.setItem('debug-api', 'true');

console.log('🚀 Axios API client initialized with multiple fallback strategies');