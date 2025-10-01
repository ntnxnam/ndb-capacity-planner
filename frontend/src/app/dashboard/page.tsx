'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, DataEntry, CalculationRule } from '@/lib/api';
import { 
  Database, 
  Users, 
  Calculator, 
  FileText,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({
    dataEntries: 0,
    calculationRules: 0,
    users: 0,
    recentEntries: [] as DataEntry[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState?.isAuthenticated === false) {
      router.push('/login');
      return;
    }

    if (authState?.isAuthenticated) {
      loadDashboardData();
    }
  }, [authState]); // Removed router from dependencies

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const userProfile = await api.getUserProfile();
      setUser(userProfile);

      // Get dashboard statistics
      const [dataEntries, calculationRules, users] = await Promise.all([
        api.getDataEntries(),
        api.getCalculationRules(),
        userProfile.role === 'user' ? Promise.resolve([]) : api.getUsers()
      ]);

      setStats({
        dataEntries: dataEntries.length,
        calculationRules: calculationRules.length,
        users: users.length,
        recentEntries: dataEntries.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !authState?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Data Entries',
      value: stats.dataEntries,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Total data entries'
    },
    {
      name: 'Calculation Rules',
      value: stats.calculationRules,
      icon: Calculator,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Active calculation rules'
    },
    ...(user?.role !== 'user' ? [{
      name: 'Users',
      value: stats.users,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Total users'
    }] : []),
    {
      name: 'System Health',
      value: 'Good',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'All systems operational'
    }
  ];

  return (
    <Layout user={user || undefined}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-600 mt-2">
            Here's an overview of your NDB Capacity Planning system.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="card">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </h3>
                    <p className="text-sm font-medium text-slate-600">
                      {stat.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => router.push('/config')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-slate-900">Configure Data Fields</p>
                      <p className="text-sm text-slate-600">Set up data collection fields</p>
                    </div>
                  </div>
                </button>
              )}
              
              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <button
                  onClick={() => router.push('/data')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">Add Data Entry</p>
                      <p className="text-sm text-slate-600">Input new capacity data</p>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => router.push('/calculations')}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">Run Calculations</p>
                    <p className="text-sm text-slate-600">Execute capacity planning calculations</p>
                  </div>
                </div>
              </button>

              {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <button
                  onClick={() => router.push('/users')}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-slate-900">Manage Users</p>
                      <p className="text-sm text-slate-600">User roles and permissions</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Recent Data Entries
            </h2>
            {stats.recentEntries.length > 0 ? (
              <div className="space-y-3">
                {stats.recentEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">
                        Entry {entry.id.slice(0, 8)}...
                      </p>
                      <p className="text-sm text-slate-600">
                        by {entry.created_by_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No data entries yet</p>
                <p className="text-sm">Start by adding your first data entry</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

