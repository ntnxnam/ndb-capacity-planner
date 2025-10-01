'use client';

import { useEffect } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Shield, Database } from 'lucide-react';

export default function LoginPage() {
  const { oktaAuth, authState } = useOktaAuth();
  const router = useRouter();

  useEffect(() => {
    if (authState?.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authState]); // Removed router from dependencies

  const handleLogin = async () => {
    try {
      await oktaAuth.signInWithRedirect();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nutanix-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-full mb-6 mx-auto">
            <Database className="h-10 w-10 text-primary-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            NDB Capacity Planner
          </h1>
          <p className="text-slate-600 mb-8">
            Nutanix Database Service Capacity Planning Tool
          </p>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
            >
              <Shield className="h-5 w-5" />
              <span>Sign in (Local Development)</span>
            </button>

            <div className="text-sm text-slate-500">
              <p>Access restricted to Nutanix employees</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              <p className="mb-2"><strong>Role-Based Access:</strong></p>
              <div className="space-y-1 text-left">
                <div className="flex items-center space-x-2">
                  <span className="badge badge-superadmin">SuperAdmin</span>
                  <span>Full system access & user management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="badge badge-admin">Admin</span>
                  <span>Data editing & management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="badge badge-user">User</span>
                  <span>View data & run calculations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

