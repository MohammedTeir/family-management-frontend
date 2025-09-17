import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as axiosApiRequest, fetchApi } from "./axios-api";
import { AxiosResponse } from "axios";

// Convert axios response to fetch-like response for compatibility
async function axiosToFetchResponse(axiosResponse: AxiosResponse): Promise<Response> {
  const response = {
    ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
    status: axiosResponse.status,
    statusText: axiosResponse.statusText,
    headers: new Map(Object.entries(axiosResponse.headers)),
    json: async () => axiosResponse.data,
    text: async () => JSON.stringify(axiosResponse.data),
  } as Response;
  
  return response;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string>; signal?: AbortSignal }
): Promise<Response> {
  try {
    // Use axios-based request with automatic fallbacks
    const axiosResponse = await axiosApiRequest(method as any, url, data, {
      headers: options?.headers,
      signal: options?.signal,
    });
    
    const fetchResponse = await axiosToFetchResponse(axiosResponse);
    await throwIfResNotOk(fetchResponse);
    return fetchResponse;
    
  } catch (error: any) {
    // Convert axios error to fetch-like error
    if (error.response) {
      const fetchResponse = await axiosToFetchResponse(error.response);
      await throwIfResNotOk(fetchResponse);
      return fetchResponse;
    }
    
    throw new Error(error.message || 'Request failed');
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchApi(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Enhanced retry logic with multiple fallback strategies
        const maxRetries = 3;
        
        if (failureCount < maxRetries) {
          // Retry on network errors
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.log(`🔄 Retrying query due to network error (attempt ${failureCount + 1}/${maxRetries})`);
            return true;
          }
          
          // Retry on 5xx server errors
          if (error.message.includes(':') && parseInt(error.message.split(':')[0]) >= 500) {
            console.log(`🔄 Retrying query due to server error (attempt ${failureCount + 1}/${maxRetries})`);
            return true;
          }
          
          // Retry on CORS errors
          if (error.message.includes('CORS') || error.message.includes('blocked')) {
            console.log(`🔄 Retrying query due to CORS error (attempt ${failureCount + 1}/${maxRetries})`);
            return true;
          }

          // Don't retry on auth errors (401/403) - handle them differently
          if (error.message.includes('401') || error.message.includes('403')) {
            console.log(`❌ Not retrying auth error: ${error.message}`);
            return false;
          }
        }
        
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Retry mutations on network errors only
        if (failureCount < 2) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.log(`🔄 Retrying mutation due to network error (attempt ${failureCount + 1}/2)`);
            return true;
          }
        }
        return false;
      },
      retryDelay: 1000, // 1 second delay for mutation retries
    },
  },
});
