// Re-export axios-based API for backward compatibility
export { fetchApi, apiGet, apiPost, apiPut, apiDelete, apiPatch } from './axios-api';

// Import interceptors to initialize them
import './axios-interceptors';

console.log('🔄 API client migrated to axios with enhanced fallback strategies');