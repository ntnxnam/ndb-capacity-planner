'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api } from '@/lib/api';
import { 
  Settings, 
  Loader2,
  Database,
  Users,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface JiraComponent {
  id: string;
  name: string;
  description?: string;
  assigneeType?: string;
  lead?: {
    key: string;
    name: string;
    displayName: string;
  };
}

interface JiraAssignee {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  active: boolean;
}

export default function JiraComponentsPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [components, setComponents] = useState<JiraComponent[]>([]);
  const [assignees, setAssignees] = useState<JiraAssignee[]>([]);
  const [loading, setLoading] = useState(false); // Start with false since we'll load on demand
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComponents, setShowComponents] = useState(true);
  const [showAssignees, setShowAssignees] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded

  // Load data from localStorage on component mount
  useEffect(() => {
    if (authState.isAuthenticated) {
      loadCachedData();
    }
  }, [authState.isAuthenticated]);

  const loadCachedData = () => {
    try {
      const cachedComponents = localStorage.getItem('jira-components');
      const cachedAssignees = localStorage.getItem('jira-assignees');
      
      if (cachedComponents) {
        setComponents(JSON.parse(cachedComponents));
      }
      
      if (cachedAssignees) {
        setAssignees(JSON.parse(cachedAssignees));
      }
      
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading cached data:', error);
      setDataLoaded(true);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Frontend: Fetching JIRA data...');
      
      const [componentsData, assigneesData] = await Promise.all([
        api.getJiraComponents(),
        api.getJiraAssignees()
      ]);
      
      console.log('✅ Frontend: Successfully fetched data:', {
        components: componentsData.length,
        assignees: assigneesData.length
      });
      
      // Update state
      setComponents(componentsData);
      setAssignees(assigneesData);
      
      // Cache the data in localStorage
      try {
        localStorage.setItem('jira-components', JSON.stringify(componentsData));
        localStorage.setItem('jira-assignees', JSON.stringify(assigneesData));
        console.log('✅ Frontend: Data cached successfully');
      } catch (cacheError) {
        console.warn('⚠️ Frontend: Failed to cache data:', cacheError);
      }
      
      setDataLoaded(true);
    } catch (error: any) {
      console.error('❌ Frontend: Error fetching JIRA data:', error);
      setError(`Failed to fetch JIRA data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!dataLoaded && loading) {
    return (
      <Layout user={undefined}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Fetching JIRA components and assignees.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      user={undefined}
      pageHeader={{
        title: "JIRA Components & Assignees",
        description: "Manage ERA project components and assignable users from JIRA. Data is stored in the database and synced manually to ensure accuracy and performance.",
        icon: Database
      }}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!dataLoaded ? (
              <button
                onClick={fetchData}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
                title="Load JIRA components and assignees from the ERA project and store them in the database"
              >
                <Database className="h-4 w-4" />
                Load JIRA Data
              </button>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary flex items-center gap-2"
                title="Refresh JIRA data from the ERA project to get the latest components and assignees"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Sync with JIRA
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowComponents(!showComponents)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showComponents ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showComponents ? 'Hide' : 'Show'} Components
            </button>
            
            <button
              onClick={() => setShowAssignees(!showAssignees)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showAssignees ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showAssignees ? 'Hide' : 'Show'} Assignees
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Components Section */}
        {showComponents && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">ERA Project Components</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {components.length} components
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {components.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Components Found</h3>
                  <p className="text-gray-600">No components were found in the ERA project.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Component Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lead
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {components.map((component) => (
                        <tr key={component.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{component.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{component.id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {component.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {component.assigneeType ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {component.assigneeType}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {component.lead?.displayName || '-'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assignees Section */}
        {showAssignees && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">ERA Project Assignees</h2>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {assignees.length} users
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {assignees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignees Found</h3>
                  <p className="text-gray-600">No assignable users were found in the ERA project.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignees.map((assignee) => (
                        <tr key={assignee.accountId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {assignee.avatarUrls?.['32x32'] ? (
                                  <img 
                                    src={assignee.avatarUrls['32x32']} 
                                    alt={assignee.displayName}
                                    className="h-10 w-10 rounded-full"
                                  />
                                ) : (
                                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-600" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {assignee.displayName}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {assignee.emailAddress || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono">
                              {assignee.accountId}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              assignee.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {assignee.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Data Summary</h3>
              <p className="text-sm text-blue-600 mt-1">
                Successfully loaded {components.length} components and {assignees.length} assignable users from the ERA project.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
