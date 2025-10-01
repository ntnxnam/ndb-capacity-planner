'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User } from '@/lib/api';
import { 
  Database, 
  Settings, 
  Plus, 
  Calendar, 
  CheckCircle, 
  Loader2,
  ArrowLeft,
  Save,
  RotateCcw
} from 'lucide-react';

export default function DataFieldsConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFields, setDateFields] = useState([
    { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
    { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
    { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
    { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
    { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
    { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
    { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
  ]);
  const [savingFields, setSavingFields] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    const loadDateFieldsConfig = async () => {
      try {
        const config = await api.getDateFieldsConfig();
        setDateFields(config);
      } catch (error) {
        console.error('Error loading date fields configuration:', error);
        // Keep default values if loading fails
      }
    };

    fetchUserProfile();
    loadDateFieldsConfig();
  }, []);

  if (loading || !user) {
    return (
      <Layout user={user || undefined}>
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
      <Layout user={user || undefined}>
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

  const toggleFieldEnabled = (key: string) => {
    setDateFields(prev => prev.map(field => 
      field.key === key ? { ...field, isEnabled: !field.isEnabled } : field
    ));
  };

  const toggleFieldRequired = (key: string) => {
    setDateFields(prev => prev.map(field => 
      field.key === key ? { ...field, isRequired: !field.isRequired } : field
    ));
  };

  const handleSaveFields = async () => {
    setSavingFields(true);
    try {
      await api.saveDateFieldsConfig(dateFields);
      
      // Audit logging
      const defaultFields = [
        { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
        { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
        { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
        { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
        { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
        { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
        { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
      ];
      
      const changes = dateFields.filter(field => {
        const defaultField = defaultFields.find(df => df.key === field.key);
        return defaultField && (
          field.isRequired !== defaultField.isRequired || 
          field.isEnabled !== defaultField.isEnabled
        );
      }).map(field => ({
        field: field.key,
        label: field.label,
        changes: {
          isRequired: { from: true, to: field.isRequired },
          isEnabled: { from: true, to: field.isEnabled }
        }
      }));
      
      console.log('🔧 Date fields configuration changed:', {
        previous: defaultFields,
        current: dateFields,
        changes
      });
      
      alert('Date fields configuration saved successfully!');
    } catch (error) {
      console.error('Error saving date fields configuration:', error);
      alert('Failed to save date fields configuration');
    } finally {
      setSavingFields(false);
    }
  };

  const handleResetFields = () => {
    const defaultFields = [
      { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
      { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
      { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
      { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
      { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
      { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
      { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
    ];
    setDateFields(defaultFields);
  };

  const isDefaultDateFieldsConfiguration = () => {
    const defaultFields = [
      { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
      { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
      { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
      { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
      { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
      { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
      { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
    ];
    
    return dateFields.every(field => {
      const defaultField = defaultFields.find(df => df.key === field.key);
      return defaultField && 
        field.isRequired === defaultField.isRequired && 
        field.isEnabled === defaultField.isEnabled;
    });
  };

  return (
    <Layout 
      user={user}
      pageHeader={{
        title: "Data Fields Configuration",
        description: "Configure date fields, their requirements, and display settings",
        icon: Database
      }}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/config')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Configuration
          </button>
        </div>

        {/* Data Fields Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Current Date Fields
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure which date fields are enabled and required
                </p>
              </div>
              <button 
                onClick={() => router.push('/config/data-fields/new')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Field
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {dateFields.map((field, index) => (
                <div key={field.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Calendar className={`h-5 w-5 ${field.isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {field.label}
                        {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <p className="text-sm text-gray-600">{field.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Required:</span>
                      <button
                        onClick={() => toggleFieldRequired(field.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          field.isRequired ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            field.isRequired ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Enabled:</span>
                      <button
                        onClick={() => toggleFieldEnabled(field.key)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          field.isEnabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            field.isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleResetFields}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
              
              <div className="flex items-center gap-4">
                {isDefaultDateFieldsConfiguration() && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Date fields configuration matches default values
                  </div>
                )}
                
                {!isDefaultDateFieldsConfiguration() && (
                  <button
                    onClick={handleSaveFields}
                    disabled={savingFields}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingFields ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Configuration
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
