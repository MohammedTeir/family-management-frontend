import { createContext, ReactNode, useContext, useState, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "../types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { attemptSessionRecovery, clearAllCookies, debugSessionInfo } from "../lib/session-recovery";

// Extend AuthContextType
interface AuthContextType {
  user: SelectUser | null;
  family: any | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  dualRole: boolean;
  currentDashboard: "admin" | "head";
  chooseDashboard: (dashboard: "admin" | "head") => void;
}

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch family data for head users
  const {
    data: family,
    isLoading: familyLoading,
  } = useQuery({
    queryKey: ["/api/family"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && (user.role === "head" || (user.role === "admin" && /^\d+$/.test(user.username))),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [currentDashboard, setCurrentDashboard] = useState<"admin" | "head">("admin");

  // Dual-role: admin with numeric username
  const dualRole = useMemo(() => {
    return user && user.role === "admin" && /^\d+$/.test(user.username);
  }, [user]);

  const chooseDashboard = (dashboard: "admin" | "head") => setCurrentDashboard(dashboard);

  // Enhanced session recovery and debugging
  useEffect(() => {
    if (!user && !isLoading) {
      console.log('🔍 No user found, attempting session recovery...');
      debugSessionInfo();
      
      // Try session recovery first
      attemptSessionRecovery().then((recovered) => {
        if (recovered) {
          refetch();
        } else {
          console.log('❌ Session recovery failed, user needs to login again');
        }
      });
    }
  }, [user, isLoading, refetch]);

  // Listen for session events from axios interceptors
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      console.log('🔒 Auth error event received:', event.detail);
      // Force user data refresh
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    };

    const handleSessionExpired = (event: CustomEvent) => {
      console.log('⏰ Session expired event received');
      // Clear all user data and redirect to auth
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.clear();
      setLocation("/auth");
    };

    // Add event listeners
    window.addEventListener('auth-error', handleAuthError as EventListener);
    window.addEventListener('session-expired', handleSessionExpired as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
      window.removeEventListener('session-expired', handleSessionExpired as EventListener);
    };
  }, [queryClient, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('🔐 Attempting login...');
      debugSessionInfo();
      
      // Clear any existing user data before login attempt
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      
      console.log('✅ Login successful:', userData);
      debugSessionInfo();
      
      return userData;
    },
    onSuccess: (user: SelectUser) => {
      console.log('🎉 Login mutation success, setting user data...');
      queryClient.setQueryData(["/api/user"], user);
      // Invalidate family data to trigger refetch for head users
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      
      // Verify session immediately after login
      setTimeout(() => {
        console.log('🔍 Verifying session after login...');
        refetch();
      }, 1000);
    },
    onError: (error: Error) => {
      console.error('❌ Login failed:', error);
      debugSessionInfo();
      
      // Ensure user data is cleared on login failure
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Use the exact error message from the backend
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear all user and family data from cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.clear(); // Clear all cached data
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        family: family ?? null,
        isLoading: isLoading || familyLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        dualRole,
        currentDashboard,
        chooseDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
