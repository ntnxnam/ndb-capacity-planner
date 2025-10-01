'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Calendar, User, Activity, AlertCircle } from 'lucide-react';
import { api, User as UserType } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { useOktaAuth } from '@/lib/localAuthHook';

interface AuditLog {
  timestamp: string;
  level: string;
  category: string;
  message: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

interface AuditStats {
  period: string;
  totalLogs: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  topUsers: Array<{
    user_email: string;
    action_count: number;
  }>;
}

export default function AuditLogsPage() {
  const { authState } = useOktaAuth();
  const [user, setUser] = useState<UserType | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    resource: '',
    level: '',
    category: '',
    limit: '50',
    offset: '0'
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/audit-logs?${params.toString()}`);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/audit-logs/stats?days=30');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch audit stats:', error);
    }
  };

  useEffect(() => {
    if (authState?.isAuthenticated) {
      loadUserProfile();
      fetchLogs();
      fetchStats();
    }
  }, [authState, filters]);

  const loadUserProfile = async () => {
    try {
      const userProfile = await api.getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      resource: '',
      level: '',
      category: '',
      limit: '50',
      offset: '0'
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-200';
      case 'WARN': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'INFO': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'AUDIT': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DEBUG': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AUTH': return <User className="h-4 w-4" />;
      case 'API': return <Activity className="h-4 w-4" />;
      case 'USER_ACTION': return <User className="h-4 w-4" />;
      case 'SECURITY': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading && !user) {
    return (
      <Layout user={undefined}>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <Activity className="h-8 w-8 text-gray-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-2">Audit Logs</h1>
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user || undefined}>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Audit Logs</h1>
          <p className="text-gray-600">Monitor system activity and user actions. Track all changes, API calls, and security events for compliance and debugging purposes.</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Logs</p>
                  <p className="text-2xl font-bold text-black">{stats.totalLogs.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{stats.byLevel.ERROR || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{stats.topUsers.length}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Period</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.period}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 mr-2" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="user@example.com"
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="input w-full"
              >
                <option value="">All Actions</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_LOGOUT">User Logout</option>
                <option value="DATA_CREATED">Data Created</option>
                <option value="DATA_UPDATED">Data Updated</option>
                <option value="DATA_DELETED">Data Deleted</option>
                <option value="DATE_CHANGED">Date Changed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="input w-full"
              >
                <option value="">All Resources</option>
                <option value="release_plan">Release Plan</option>
                <option value="user">User</option>
                <option value="calculation_rule">Calculation Rule</option>
                <option value="data_entry">Data Entry</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="input w-full"
              >
                <option value="">All Levels</option>
                <option value="DEBUG">Debug</option>
                <option value="INFO">Info</option>
                <option value="WARN">Warning</option>
                <option value="ERROR">Error</option>
                <option value="AUDIT">Audit</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input w-full"
              >
                <option value="">All Categories</option>
                <option value="AUTH">Authentication</option>
                <option value="API">API</option>
                <option value="USER_ACTION">User Action</option>
                <option value="SECURITY">Security</option>
                <option value="DATABASE">Database</option>
                <option value="SYSTEM">System</option>
                <option value="PERFORMANCE">Performance</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="input w-full"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="btn-secondary mr-2"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchLogs}
              className="btn-primary"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Audit Logs</h2>
            <button
              onClick={() => window.print()}
              className="btn-secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resource
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getCategoryIcon(log.category)}
                          <span className="ml-2 text-sm text-gray-900">{log.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.userEmail || 'System'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.action || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.resource || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {logs.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No audit logs found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
