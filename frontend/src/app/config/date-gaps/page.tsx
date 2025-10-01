'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User } from '@/lib/api';
import { DEFAULTS } from '@/lib/defaults';
import { 
  Calendar, 
  Settings, 
  CheckCircle, 
  Loader2,
  ArrowLeft,
  Save,
  RotateCcw
} from 'lucide-react';

export default function DateGapsConfigPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateGaps, setDateGaps] = useState({
    gaToPromotionGate: 4,
    promotionGateToCommitGate: 4,
    commitGateToSoftCodeComplete: 4,
    softCodeCompleteToExecuteCommit: 4,
    executeCommitToConceptCommit: 4,
    conceptCommitToPreCC: 4
  });
  const [savingGaps, setSavingGaps] = useState(false);

  const defaultDateGaps = DEFAULTS.DATE_GAPS;

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

    const loadDateGapsConfig = async () => {
      try {
        const config = await api.getDateGapsConfig();
        setDateGaps(config);
      } catch (error) {
        console.error('Error loading date gaps configuration:', error);
        // Keep default values if loading fails
      }
    };

    fetchUserProfile();
    loadDateGapsConfig();
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

  const handleGapChange = (key: keyof typeof dateGaps, value: number) => {
    setDateGaps(prev => ({
      ...prev,
      [key]: Math.max(1, Math.min(52, value)) // Ensure value is between 1-52 weeks
    }));
  };

  const handleSaveGaps = async () => {
    setSavingGaps(true);
    try {
      await api.saveDateGapsConfig(dateGaps);
      
      // Audit logging
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
      
      alert('Date gaps configuration saved successfully!');
    } catch (error) {
      console.error('Error saving date gaps configuration:', error);
      alert('Failed to save date gaps configuration');
    } finally {
      setSavingGaps(false);
    }
  };

  const handleResetGaps = () => {
    setDateGaps(defaultDateGaps);
  };

  const isDefaultConfiguration = () => {
    return Object.keys(dateGaps).every(key => 
      dateGaps[key as keyof typeof dateGaps] === defaultDateGaps[key as keyof typeof defaultDateGaps]
    );
  };

  const gapConfigurations = [
    {
      key: 'gaToPromotionGate' as keyof typeof dateGaps,
      label: 'GA to Promotion Gate',
      description: 'Weeks between General Availability and Promotion Gate'
    },
    {
      key: 'promotionGateToCommitGate' as keyof typeof dateGaps,
      label: 'Promotion Gate to Commit Gate',
      description: 'Weeks between Promotion Gate and Commit Gate'
    },
    {
      key: 'commitGateToSoftCodeComplete' as keyof typeof dateGaps,
      label: 'Commit Gate to Soft Code Complete',
      description: 'Weeks between Commit Gate and Soft Code Complete'
    },
    {
      key: 'softCodeCompleteToExecuteCommit' as keyof typeof dateGaps,
      label: 'Soft Code Complete to Execute Commit',
      description: 'Weeks between Soft Code Complete and Execute Commit'
    },
    {
      key: 'executeCommitToConceptCommit' as keyof typeof dateGaps,
      label: 'Execute Commit to Concept Commit',
      description: 'Weeks between Execute Commit and Concept Commit'
    },
    {
      key: 'conceptCommitToPreCC' as keyof typeof dateGaps,
      label: 'Concept Commit to Pre-CC',
      description: 'Weeks between Concept Commit and Pre-CC Complete'
    }
  ];

  return (
    <Layout 
      user={user}
      pageHeader={{
        title: "Date Gaps Configuration",
        description: "Set the number of weeks between different milestone dates",
        icon: Calendar
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

        {/* Date Gap Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Date Gap Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure the number of weeks between different milestone dates
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {gapConfigurations.map((config) => (
                <div key={config.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{config.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={dateGaps[config.key]}
                        onChange={(e) => handleGapChange(config.key, parseInt(e.target.value) || 1)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      />
                      <span className="text-sm text-gray-600">weeks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handleResetGaps}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </button>
              
              <div className="flex items-center gap-4">
                {isDefaultConfiguration() && (
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Configuration matches default values
                  </div>
                )}
                
                {!isDefaultConfiguration() && (
                  <button
                    onClick={handleSaveGaps}
                    disabled={savingGaps}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingGaps ? (
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
