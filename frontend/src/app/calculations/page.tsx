'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, CalculationRule } from '@/lib/api';
import { 
  Calculator, 
  Plus, 
  Edit, 
  Trash2, 
  Play,
  Loader2,
  Zap,
  Code,
  Eye
} from 'lucide-react';

export default function CalculationsPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [rules, setRules] = useState<CalculationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchUserProfile();
      fetchCalculations();
    }
  }, [authState]);

  const fetchUserProfile = async () => {
    try {
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const rulesData = await api.getCalculationRules();
      setRules(rulesData);
    } catch (error) {
      console.error('Error fetching calculation rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this calculation rule?')) {
      try {
        await api.deleteCalculationRule(id);
        await fetchCalculations();
      } catch (error) {
        console.error('Error deleting calculation rule:', error);
      }
    }
  };

  const handleRun = async (id: string) => {
    try {
      const result = await api.runCalculation(id, {});
      alert(`Calculation result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Error running calculation:', error);
      alert('Error running calculation. Check the console for details.');
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="h-8 w-8 text-green-600" />
              Calculations
            </h1>
            <p className="text-gray-600 mt-2">
              AI-powered calculation rules and capacity planning logic
            </p>
          </div>
          {user?.role === 'superadmin' && (
            <button 
              onClick={() => router.push('/calculations/new')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Rule
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid gap-6">
            {rules.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No calculation rules found
                </h3>
                <p className="text-gray-600 mb-4">
                  Create AI-powered calculation rules to analyze your capacity data
                </p>
                {user?.role === 'superadmin' && (
                  <button 
                    onClick={() => router.push('/calculations/new')}
                    className="btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Create Rule
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {rule.ai_prompt ? (
                          <Zap className="h-5 w-5 text-purple-600" title="AI Generated" />
                        ) : (
                          <Code className="h-5 w-5 text-gray-600" title="Custom Logic" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {rule.description}
                    </p>

                    {rule.ai_prompt && (
                      <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-800 font-medium mb-1">AI Prompt:</p>
                        <p className="text-xs text-purple-700 line-clamp-2">
                          {rule.ai_prompt}
                        </p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mb-4">
                      Created by {rule.created_by_name} on {new Date(rule.created_at).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button 
                        onClick={() => handleRun(rule.id)}
                        className="btn-primary flex items-center gap-1 text-xs px-3 py-1"
                      >
                        <Play className="h-3 w-3" />
                        Run
                      </button>
                      
                      <button 
                        onClick={() => router.push(`/calculations/${rule.id}`)}
                        className="btn-secondary flex items-center gap-1 text-xs px-3 py-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>

                      {user?.role === 'superadmin' && (
                        <>
                          <button 
                            onClick={() => router.push(`/calculations/${rule.id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-900 p-1"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => handleDelete(rule.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
