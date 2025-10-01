'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Simulate OKTA callback processing for local development
    console.log('🚀 LOCAL DEV MODE - Simulating login callback');
    
    // Set a fake token and redirect to dashboard
    localStorage.setItem('local_access_token', 'local-dev-token');
    
    // Redirect after a short delay to simulate processing
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Signing you in...</h1>
        <p className="text-slate-600">Local development mode - completing authentication.</p>
      </div>
    </div>
  );
}

