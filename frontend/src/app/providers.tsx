'use client';

import React from 'react';
// import { Security } from '@okta/okta-react'; // REMOVED FOR LOCAL DEV
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { oktaConfig } from '@/lib/okta-config'; // REMOVED FOR LOCAL DEV
import { Toaster } from 'react-hot-toast';
import { LocalDevProvider } from '@/components/LocalDevProvider';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // OKTA completely removed - always use local development mode
  console.log('🚀 LOCAL DEV MODE - OKTA authentication bypassed');
  
  return (
    <QueryClientProvider client={queryClient}>
      <LocalDevProvider>
        {children}
        <Toaster position="top-right" />
      </LocalDevProvider>
    </QueryClientProvider>
  );
}

