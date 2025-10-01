'use client';

import React, { createContext, useContext } from 'react';

// Simple local development authentication context
const LocalDevAuthContext = createContext({
  isAuthenticated: true,
  user: {
    email: 'local-dev@nutanix.com',
    name: 'Local Dev User',
    role: 'SuperAdmin'
  },
  authToken: 'local-dev-token'
});

export function LocalDevProvider({ children }: { children: React.ReactNode }) {
  console.log('🚀 LOCAL DEV MODE - Bypassing OKTA authentication');
  
  return (
    <LocalDevAuthContext.Provider value={{
      isAuthenticated: true,
      user: {
        email: 'local-dev@nutanix.com',
        name: 'Local Dev User',
        role: 'SuperAdmin'
      },
      authToken: 'local-dev-token'
    }}>
      {children}
    </LocalDevAuthContext.Provider>
  );
}

export function useLocalDevAuth() {
  return useContext(LocalDevAuthContext);
}
