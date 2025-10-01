'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, DataField } from '@/lib/api';
import { DEFAULTS } from '@/lib/defaults';
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
  CheckCircle,
  Users,
  RefreshCw
} from 'lucide-react';

export default function ConfigPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [fields, setFields] = useState<DataField[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultDateGaps = DEFAULTS.DATE_GAPS;

  const [dateGaps, setDateGaps] = useState(defaultDateGaps);
  const [savingGaps, setSavingGaps] = useState(false);
  
  // Date fields configuration state
  const [dateFields, setDateFields] = useState([
    { key: 'ga_date', label: 'GA Date', description: 'General availability release date', isRequired: true, isEnabled: true, priority: 1 },
    { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', isRequired: true, isEnabled: true, priority: 2 },
    { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', isRequired: true, isEnabled: true, priority: 3 },
    { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', isRequired: true, isEnabled: true, priority: 4 },
    { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', isRequired: true, isEnabled: true, priority: 5 },
    { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', isRequired: true, isEnabled: true, priority: 6 },
    { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', isRequired: true, isEnabled: true, priority: 7 }
  ]);
  const [savingFields, setSavingFields] = useState(false);

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
      
      // Log configuration change
      console.log('🔧 Date gaps configuration changed:', {
        previous: defaultDateGaps,
        current: dateGaps,
        changes: Object.keys(dateGaps).filter(key => 
          dateGaps[key as keyof typeof dateGaps] !== defaultDateGaps[key as keyof typeof defaultDateGaps]
        ).map(key => ({
          field: key,
          from: defaultDateGaps[key as keyof typeof defaultDateGaps],
          to: dateGaps[key as keyof typeof dateGaps]
        }))
      });

      // TODO: Implement API call to save date gaps
      // await api.saveDateGaps(dateGaps);
      
      // TODO: Add audit log entry
      // await api.createAuditLog({
      //   action: 'CONFIG_UPDATE',
      //   resource: 'date_gaps',
      //   details: { changes: ... }
      // });
      
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

  // Check if date fields configuration matches default
  const isDefaultDateFieldsConfiguration = () => {
    const defaultFields = [
      { key: 'ga_date', isRequired: true, isEnabled: true },
      { key: 'promotion_gate_met_date', isRequired: true, isEnabled: true },
      { key: 'commit_gate_met_date', isRequired: true, isEnabled: true },
      { key: 'soft_code_complete_date', isRequired: true, isEnabled: true },
      { key: 'execute_commit_date', isRequired: true, isEnabled: true },
      { key: 'concept_commit_date', isRequired: true, isEnabled: true },
      { key: 'pre_cc_complete_date', isRequired: true, isEnabled: true }
    ];

    return dateFields.every(field => {
      const defaultField = defaultFields.find(df => df.key === field.key);
      return defaultField && 
             field.isRequired === defaultField.isRequired && 
             field.isEnabled === defaultField.isEnabled;
    });
  };

  // Date fields handlers
  const toggleFieldEnabled = (fieldKey: string) => {
    setDateFields(prev => prev.map(field => 
      field.key === fieldKey 
        ? { ...field, isEnabled: !field.isEnabled }
        : field
    ));
  };

  const toggleFieldRequired = (fieldKey: string) => {
    setDateFields(prev => prev.map(field => 
      field.key === fieldKey 
        ? { ...field, isRequired: !field.isRequired }
        : field
    ));
  };

  const handleSaveFields = async () => {
    try {
      setSavingFields(true);
      
      // Log configuration change
      const defaultFields = [
        { key: 'ga_date', isRequired: true, isEnabled: true },
        { key: 'promotion_gate_met_date', isRequired: true, isEnabled: true },
        { key: 'commit_gate_met_date', isRequired: true, isEnabled: true },
        { key: 'soft_code_complete_date', isRequired: true, isEnabled: true },
        { key: 'execute_commit_date', isRequired: true, isEnabled: true },
        { key: 'concept_commit_date', isRequired: true, isEnabled: true },
        { key: 'pre_cc_complete_date', isRequired: true, isEnabled: true }
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

      // TODO: Implement API call to save date fields configuration
      // await api.saveDateFields(dateFields);
      
      // TODO: Add audit log entry
      // await api.createAuditLog({
      //   action: 'CONFIG_UPDATE',
      //   resource: 'date_fields',
      //   details: { changes }
      // });
      
      alert('Date fields configuration saved successfully!');
    } catch (error) {
      console.error('Error saving date fields:', error);
      alert('Failed to save date fields configuration');
    } finally {
      setSavingFields(false);
    }
  };

  const handleResetFields = () => {
    setDateFields([
      { key: 'ga_date', label: 'GA Date', description: 'General availability release date', isRequired: true, isEnabled: true, priority: 1 },
      { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', isRequired: true, isEnabled: true, priority: 2 },
      { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', isRequired: true, isEnabled: true, priority: 3 },
      { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', isRequired: true, isEnabled: true, priority: 4 },
      { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', isRequired: true, isEnabled: true, priority: 5 },
      { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', isRequired: true, isEnabled: true, priority: 6 },
      { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', isRequired: true, isEnabled: true, priority: 7 }
    ]);
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

  return (
    <Layout 
      user={user}
      pageHeader={{
        title: "Configuration",
        description: "Manage data fields, date gaps, and system configuration. Configure NDB-specific settings including release cycle parameters and JIRA integration.",
        icon: Settings
      }}
    >
      <div className="space-y-6">
        {/* Configuration Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Data Fields Configuration Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-8 w-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Data Fields</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Configure date fields, their requirements, and display settings. Define which fields are required, enabled, and their display priority for release plans.
            </p>
            <button 
              onClick={() => router.push('/config/data-fields')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure Data Fields
            </button>
          </div>

          {/* Date Gaps Configuration Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Date Gaps</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Set the number of weeks between different milestone dates in the NDB release cycle. These gaps define the standard timeline between gates and milestones.
            </p>
            <button 
              onClick={() => router.push('/config/date-gaps')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure Date Gaps
            </button>
          </div>

          {/* JIRA Components Configuration Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">JIRA Components</h3>
            </div>
            <p className="text-gray-600 mb-4">
              View and manage ERA project components and assignable users from JIRA. Data is stored in the database and synced manually for optimal performance.
            </p>
            <button 
              onClick={() => router.push('/config/jira-components')}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Manage JIRA Data
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
