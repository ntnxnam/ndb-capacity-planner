import { useMemo } from 'react';

// Mock replacement for useOktaAuth in local development
export function useLocalAuth() {
  return useMemo(() => ({
    oktaAuth: {
      signOut: () => {
        console.log('🚀 Local dev signOut called');
        localStorage.clear();
        window.location.href = '/';
      },
      signInWithRedirect: () => {
        console.log('🚀 Local dev signInWithRedirect called - auto login');
        localStorage.setItem('local_access_token', 'local-dev-token');
        window.location.href = '/dashboard';
      }
    },
    authState: {
      isAuthenticated: true,
      isPending: false,
      accessToken: {
        accessToken: 'local-dev-token'
      }
    }
  }), []); // Empty dependency array - this should never change
}

// Re-export for compatibility
export const useOktaAuth = useLocalAuth;

