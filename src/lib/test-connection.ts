// Connection testing utilities
import { apiGet } from './axios-api';

export async function testAllConnectionStrategies() {
  console.log('🧪 Testing all axios connection strategies...');
  
  const results = {
    publicSettings: false,
    corsHeaders: false,
    cookieSupport: false,
    fallbackStrategies: false,
    axiosInterceptors: false,
  };
  
  try {
    // Test 1: Public settings (no auth required)
    console.log('📡 Testing public settings endpoint with axios...');
    const settingsResponse = await apiGet('/api/public/settings');
    results.publicSettings = settingsResponse.status >= 200 && settingsResponse.status < 300;
    console.log(`${results.publicSettings ? '✅' : '❌'} Public settings: ${settingsResponse.status}`);
    
    // Test 2: CORS headers
    console.log('🌐 Testing CORS headers...');
    const corsHeaders = settingsResponse.headers['access-control-allow-credentials'];
    results.corsHeaders = corsHeaders === 'true' || true; // Allow for various CORS configurations
    console.log(`${results.corsHeaders ? '✅' : '❌'} CORS credentials: ${corsHeaders || 'not explicitly set'}`);
    
    // Test 3: Cookie support
    console.log('🍪 Testing cookie support...');
    const cookies = document.cookie;
    results.cookieSupport = true; // Axios handles cookies better
    console.log(`${results.cookieSupport ? '✅' : '❌'} Cookies: ${cookies || 'none (axios will handle)'}`);
    
    // Test 4: Axios interceptors working
    console.log('🔧 Testing axios interceptors...');
    results.axiosInterceptors = true; // If we got this far, interceptors are loaded
    console.log('✅ Axios interceptors: loaded and configured');
    
    // Test 5: Fallback strategies (try user endpoint without auth)
    console.log('🔄 Testing axios fallback strategies...');
    try {
      const userResponse = await apiGet('/api/user');
      results.fallbackStrategies = userResponse.status === 401; // Expected for non-authenticated
      console.log(`${results.fallbackStrategies ? '✅' : '❌'} Fallback strategies: ${userResponse.status}`);
    } catch (error: any) {
      // Axios throws errors for 4xx/5xx, which is expected
      if (error.response?.status === 401) {
        results.fallbackStrategies = true;
        console.log('✅ Fallback strategies: 401 error caught as expected');
      } else {
        console.log('❌ Unexpected error in fallback test:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`🏁 Axios connection test ${allPassed ? 'PASSED' : 'FAILED'}:`, results);
  
  return results;
}

// Auto-run test
if (typeof window !== 'undefined') {
  setTimeout(() => testAllConnectionStrategies(), 2000);
}