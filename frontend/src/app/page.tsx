'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User } from '@/lib/api';
import { 
  Database, 
  FileText, 
  Calculator, 
  Calendar, 
  Activity,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';

export default function HomePage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    completedPlans: 0,
    upcomingDeadlines: 0
  });

  useEffect(() => {
    if (authState?.isAuthenticated === false) {
      router.push('/login');
      return;
    }

    if (authState?.isAuthenticated) {
      loadData();
    }
  }, [authState]); // Removed router from dependencies

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      try {
        const userProfile = await api.getUserProfile();
        setUser(userProfile);
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Set a default user for local development
        setUser({
          id: 'local-dev-user',
          email: 'local-dev@nutanix.com',
          name: 'Local Dev User',
          role: 'superadmin'
        });
      }

      // Get release plans for stats
      const plansResponse = await api.get('/release-plans');
      const plans = plansResponse.data || [];
      
      const now = new Date();
      const activePlans = plans.filter((plan: any) => {
        if (!plan.ga_date) return true;
        return new Date(plan.ga_date) > now;
      });
      
      const completedPlans = plans.filter((plan: any) => {
        if (!plan.ga_date) return false;
        return new Date(plan.ga_date) <= now;
      });

      const upcomingDeadlines = plans.filter((plan: any) => {
        if (!plan.ga_date) return false;
        const gaDate = new Date(plan.ga_date);
        const daysUntilGA = Math.ceil((gaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilGA > 0 && daysUntilGA <= 30;
      });

      setStats({
        totalPlans: plans.length,
        activePlans: activePlans.length,
        completedPlans: completedPlans.length,
        upcomingDeadlines: upcomingDeadlines.length
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout user={user || undefined}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Database className="h-8 w-8 text-gray-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">NDB Capacity Planner</h1>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user || undefined}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name || 'User'}! Here's your capacity planning overview.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Release Plans</p>
                  <p className="text-2xl font-bold text-black">{stats.totalPlans}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Active Plans</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activePlans}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.completedPlans}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Upcoming Deadlines</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="card">
              <h2 className="text-lg font-semibold text-black mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a
                  href="/release-plans"
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-black">Manage Release Plans</p>
                    <p className="text-sm text-gray-600">Create and track release timelines</p>
                  </div>
                </a>
                
                <a
                  href="/data"
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-black">Data Entries</p>
                    <p className="text-sm text-gray-600">Manage capacity planning data</p>
                  </div>
                </a>
                
                <a
                  href="/calculations"
                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Calculator className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-black">Calculations</p>
                    <p className="text-sm text-gray-600">Configure calculation rules</p>
                  </div>
                </a>
                
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <a
                    href="/audit-logs"
                    className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Activity className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <p className="font-medium text-black">Audit Logs</p>
                      <p className="text-sm text-gray-600">Monitor system activity</p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-black mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-black">System Initialized</p>
                    <p className="text-xs text-gray-600">Local development mode active</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-black">Authentication Ready</p>
                    <p className="text-xs text-gray-600">Local dev authentication enabled</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-black">Logging System Active</p>
                    <p className="text-xs text-gray-600">Comprehensive audit logging enabled</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

