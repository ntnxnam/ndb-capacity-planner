'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, JiraRelease } from '@/lib/api';
import { 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Database,
  Download,
  Trash2,
  Table
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JiraReleasesPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [jiraStatus, setJiraStatus] = useState<{
    configured: boolean;
    connection_status: string;
    last_synced_at?: string;
    total_releases: number;
  } | null>(null);

  useEffect(() => {
    if (authState?.isAuthenticated === false) {
      router.push('/login');
      return;
    }

    if (authState?.isAuthenticated) {
      loadJiraStatus();
      loadExistingReleases();
    }
  }, [authState]); // Removed router from dependencies

  const loadJiraStatus = async () => {
    try {
      console.log('Loading JIRA status...');
      const statusResponse = await api.getJiraStatus();
      console.log('JIRA status response:', statusResponse);
      if (statusResponse.success) {
        setJiraStatus(statusResponse.data);
      }
    } catch (error) {
      console.error('Error loading JIRA status:', error);
      // Set a default status for debugging
      setJiraStatus({
        configured: true,
        connection_status: 'connected',
        total_releases: 0
      });
    }
  };

  const loadExistingReleases = async () => {
    try {
      console.log('Loading existing releases...');
      const response = await api.getJiraReleases();
      if (response.success) {
        setReleases(response.data);
        console.log(`Loaded ${response.data.length} existing releases`);
      }
    } catch (error) {
      console.error('Error loading existing releases:', error);
    }
  };

  const handleFetchReleases = async () => {
    try {
      setFetching(true);
      const response = await api.syncJiraReleases();
      
      if (response.success) {
        toast.success(`Fetched ${response.stats.total} releases from JIRA`);
        // After sync, reload the existing releases
        await loadExistingReleases();
      } else {
        toast.error('Failed to fetch JIRA releases');
      }
    } catch (error) {
      console.error('Error fetching JIRA releases:', error);
      toast.error('Failed to fetch JIRA releases');
    } finally {
      setFetching(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getObjectKeys = (obj: any): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <Layout user={undefined}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-black mb-2">JIRA Releases</h1>
                <p className="text-gray-600">
                  Fetch and display releases from JIRA ERA project
                  {jiraStatus && (
                    <span className="ml-2 text-sm">
                      (Status: {jiraStatus.connection_status})
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* JIRA Status */}
                {jiraStatus && (
                  <div className="flex items-center space-x-2 text-sm">
                    {jiraStatus.connection_status === 'connected' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : jiraStatus.connection_status === 'connection_failed' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className={jiraStatus.connection_status === 'connected' ? 'text-green-600' : 'text-red-600'}>
                      JIRA {jiraStatus.connection_status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                )}
                
                {/* Fetch Button */}
                <button
                  onClick={handleFetchReleases}
                  disabled={fetching}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                  <span>{fetching ? 'Fetching...' : 'Fetch Latest Releases'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {releases.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Table className="h-4 w-4" />
                <span>Found {releases.length} releases from JIRA</span>
              </div>
            </div>
          )}

          {/* Raw Data Table */}
          {releases.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {releases.length > 0 && getObjectKeys(releases[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {releases.map((release, index) => (
                      <tr key={release.id || index} className="hover:bg-gray-50">
                        {getObjectKeys(release).map((key) => (
                          <td
                            key={key}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            <div className="max-w-xs truncate" title={renderValue(release[key])}>
                              {renderValue(release[key])}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !fetching && (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No releases fetched yet</h3>
              <p className="text-gray-600 mb-4">
                Click "Fetch Latest Releases" to get data from JIRA
              </p>
              {!jiraStatus && (
                <div className="text-center">
                  <p className="text-yellow-600 mb-2">Loading JIRA status...</p>
                  <p className="text-sm text-gray-600">
                    Please wait while we check JIRA configuration
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {fetching && (
            <div className="text-center py-12">
              <div className="inline-flex items-center space-x-2 text-gray-600">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Fetching releases from JIRA...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
