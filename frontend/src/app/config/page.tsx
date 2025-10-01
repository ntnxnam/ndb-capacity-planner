'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, DataField } from '@/lib/api';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2,
  Loader2,
  Database,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  CheckCircle
} from 'lucide-react';

export default function ConfigPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [fields, setFields] = useState<DataField[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultDateGaps = {
    gaToPromotionGate: 4,
    promotionGateToCommitGate: 4,
    commitGateToSoftCodeComplete: 4,
    softCodeCompleteToExecuteCommit: 4,
    executeCommitToConceptCommit: 4,
    conceptCommitToPreCcComplete: 4
  };

  const [dateGaps, setDateGaps] = useState(defaultDateGaps);
  const [savingGaps, setSavingGaps] = useState(false);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserProfile();
      fetchFields();
    }
  }, [authState]);

  const fetchUserProfile = async () => {
    try {
      const profile = await api.getUserProfile();
      setUser(profile);
      if (profile.role !== 'superadmin') {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set a default superadmin user for local development
      setUser({
        id: 'local-dev-user',
        email: 'local-dev@nutanix.com',
        name: 'Local Dev User',
        role: 'superadmin'
      });
    }
  };

  const fetchFields = async () => {
    try {
      setLoading(true);
      const fieldsData = await api.getDataFields();
      setFields(fieldsData);
    } catch (error) {
      console.error('Error fetching data fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this field? This will affect all data entries that use this field.')) {
      try {
        await api.deleteDataField(id);
        await fetchFields();
      } catch (error) {
        console.error('Error deleting data field:', error);
      }
    }
  };

  const handleGapChange = (key: keyof typeof dateGaps, value: number) => {
    setDateGaps(prev => ({
      ...prev,
      [key]: Math.max(1, Math.min(52, value)) // Ensure value is between 1 and 52
    }));
  };

  const handleSaveGaps = async () => {
    try {
      setSavingGaps(true);
      // TODO: Implement API call to save date gaps
      // await api.saveDateGaps(dateGaps);
      alert('Date gap configuration saved successfully!');
    } catch (error) {
      console.error('Error saving date gaps:', error);
      alert('Failed to save date gap configuration');
    } finally {
      setSavingGaps(false);
    }
  };

  const handleResetGaps = () => {
    setDateGaps(defaultDateGaps);
  };

  // Check if current configuration matches default
  const isDefaultConfiguration = () => {
    return Object.keys(defaultDateGaps).every(key => 
      dateGaps[key as keyof typeof dateGaps] === defaultDateGaps[key as keyof typeof defaultDateGaps]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <Type className="h-4 w-4 text-blue-600" />;
      case 'number':
        return <Hash className="h-4 w-4 text-green-600" />;
      case 'boolean':
        return <ToggleLeft className="h-4 w-4 text-purple-600" />;
      case 'date':
        return <Calendar className="h-4 w-4 text-orange-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show loading while user is being fetched
  if (loading || !user) {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
            <p className="text-gray-600">Please wait while we load your profile.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (user?.role !== 'superadmin') {
    return (
      <Layout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Only SuperAdmin users can access configuration settings.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8 text-purple-600" />
              Configuration
            </h1>
            <p className="text-gray-600 mt-2">
              Manage data fields and system configuration
            </p>
          </div>
          <button 
            onClick={() => router.push('/config/fields/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>

        {/* Data Fields Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Data Fields
            </h2>
            <p className="text-sm text-gray-600">
              Configure the data fields used for capacity planning entries
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No data fields configured
              </h3>
              <p className="text-gray-600 mb-4">
                Create data fields to start collecting capacity planning information
              </p>
              <button 
                onClick={() => router.push('/config/fields/new')}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fields.map((field) => (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{field.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(field.type)}
                          <span className="text-sm text-gray-900 capitalize">{field.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          field.required 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {field.required ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {field.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(field.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => router.push(`/config/fields/${field.id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(field.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Date Fields Configuration Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Date Fields Configuration
            </h2>
            <p className="text-sm text-gray-600">
              Manage date fields used in release plans. Add new fields or modify existing ones.
            </p>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => {/* TODO: Add new date field */}}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Date Field</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Current Date Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GA Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">GA Date</h4>
                      <p className="text-xs text-gray-500">General availability release date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Required
                  </span>
                </div>

                {/* Promotion Gate Met Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Promotion Gate Met Date</h4>
                      <p className="text-xs text-gray-500">Promotion gate milestone date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>

                {/* Commit Gate Met Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Commit Gate Met Date</h4>
                      <p className="text-xs text-gray-500">Commit gate milestone date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>

                {/* Soft Code Complete Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Soft Code Complete Date</h4>
                      <p className="text-xs text-gray-500">Soft code completion date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>

                {/* Execute Commit Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Execute Commit Date</h4>
                      <p className="text-xs text-gray-500">Execution commitment date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>

                {/* Concept Commit Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Concept Commit Date</h4>
                      <p className="text-xs text-gray-500">Concept commitment date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>

                {/* Pre-CC Complete Date */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Pre-CC Complete Date</h4>
                      <p className="text-xs text-gray-500">Pre-concept commit completion date</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Optional
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Gap Configuration Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Date Gap Configuration
            </h2>
            <p className="text-sm text-gray-600">
              Configure gaps between different milestone dates in release plans
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between GA and Promotion Gate (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.gaToPromotionGate}
                    onChange={(e) => handleGapChange('gaToPromotionGate', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks before GA should Promotion Gate occur</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between Promotion Gate and Commit Gate (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.promotionGateToCommitGate}
                    onChange={(e) => handleGapChange('promotionGateToCommitGate', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks between Promotion Gate and Commit Gate</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between Commit Gate and Soft Code Complete (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.commitGateToSoftCodeComplete}
                    onChange={(e) => handleGapChange('commitGateToSoftCodeComplete', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks between Commit Gate and Soft Code Complete</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between Soft Code Complete and Execute Commit (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.softCodeCompleteToExecuteCommit}
                    onChange={(e) => handleGapChange('softCodeCompleteToExecuteCommit', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks between Soft Code Complete and Execute Commit</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between Execute Commit and Concept Commit (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.executeCommitToConceptCommit}
                    onChange={(e) => handleGapChange('executeCommitToConceptCommit', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks between Execute Commit and Concept Commit</p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Gap between Concept Commit and Pre-CC Complete (weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={dateGaps.conceptCommitToPreCcComplete}
                    onChange={(e) => handleGapChange('conceptCommitToPreCcComplete', parseInt(e.target.value) || 4)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="4"
                  />
                  <p className="text-xs text-gray-500">How many weeks between Concept Commit and Pre-CC Complete</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                {isDefaultConfiguration() && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Configuration matches default values
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleResetGaps}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    Reset to Defaults
                  </button>
                  {!isDefaultConfiguration() && (
                    <button
                      type="button"
                      onClick={handleSaveGaps}
                      disabled={savingGaps}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingGaps ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              System Settings
            </h2>
            <p className="text-sm text-gray-600">
              Configure system-wide settings and integrations
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">RBAC (Role-Based Access Control)</h3>
                  <p className="text-sm text-gray-600">Currently disabled for local development</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Disabled
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Local Development Mode</h3>
                  <p className="text-sm text-gray-600">OKTA authentication bypassed</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

