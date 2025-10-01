'use client';

import { useEffect, useState } from 'react';
import { useOktaAuth } from '@/lib/localAuthHook';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ReleasePlanForm } from '@/components/ReleasePlanForm';
import { DateHistoryTooltip } from '@/components/DateHistoryTooltip';
import { GanttChart } from '@/components/GanttChart';
import { api, User, ReleasePlan } from '@/lib/api';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  Clock,
  Target,
  CheckCircle2,
  ExternalLink,
  Users
} from 'lucide-react';

export default function ReleasePlansPage() {
  const { authState } = useOktaAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<ReleasePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ReleasePlan | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'gantt'>('list');

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
      const userProfile = await api.getUserProfile();
      setUser(userProfile);

      // Get release plans
      const releasePlans = await api.getReleasePlans();
      setPlans(releasePlans);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setViewMode('form');
    setShowForm(true);
  };

  const handleEditPlan = (plan: ReleasePlan) => {
    setSelectedPlan(plan);
    setViewMode('form');
    setShowForm(true);
  };

  const handleDeletePlan = async (plan: ReleasePlan) => {
    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) {
      return;
    }

    try {
      await api.deleteReleasePlan(plan.id);
      await loadData(); // Reload the list
    } catch (error) {
      console.error('Error deleting release plan:', error);
      alert('Failed to delete release plan');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPlan(null);
    setViewMode('list');
    loadData(); // Reload the list
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedPlan(null);
    setViewMode('list');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (date?: string) => {
    if (!date) return 'text-slate-400';
    
    const targetDate = new Date(date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-600'; // Overdue
    if (diffDays < 7) return 'text-orange-600'; // Due soon
    if (diffDays < 30) return 'text-yellow-600'; // Coming up
    return 'text-green-600'; // Future
  };

  const getStatusIcon = (date?: string) => {
    if (!date) return Clock;
    
    const targetDate = new Date(date);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return CheckCircle2; // Past due
    return Target; // Upcoming
  };

  if (loading || !authState?.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading release plans...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <Layout user={user || undefined}>
        <div className="space-y-6">
          <ReleasePlanForm
            plan={selectedPlan || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Release Plans</h1>
            <p className="text-slate-600 mt-2">
              Manage your release timeline and milestone dates
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'gantt' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Gantt Chart
              </button>
            </div>
            
            {(user?.role === 'admin' || user?.role === 'superadmin' || !user) && (
              <button
                onClick={handleCreatePlan}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Release Plan</span>
              </button>
            )}
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'gantt' ? (
          <GanttChart plans={plans} />
        ) : plans.length === 0 ? (
          <div className="card text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Release Plans</h3>
            <p className="text-slate-600 mb-6">
              Get started by creating your first release plan with timeline and milestones.
            </p>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button
                onClick={handleCreatePlan}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create Release Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-slate-600 mt-1">{plan.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
                      <span>Created by {plan.created_by_name}</span>
                      <span>•</span>
                      <span>{formatDate(plan.created_at)}</span>
                      {plan.jira_release_name && (
                        <>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <ExternalLink className="h-3 w-3" />
                            <span>JIRA: {plan.jira_release_name}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* DRIs */}
                    {plan.release_dris && (
                      <div className="mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">Release DRIs:</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-6">
                          {(() => {
                            try {
                              const dris = JSON.parse(plan.release_dris);
                              return (
                                <>
                                  {dris.qa_dri && (
                                    <div className="bg-blue-50 border border-blue-200 px-2 py-1 rounded text-xs">
                                      <span className="font-medium text-blue-800">QA:</span> {dris.qa_dri}
                                    </div>
                                  )}
                                  {dris.dev_dri && (
                                    <div className="bg-green-50 border border-green-200 px-2 py-1 rounded text-xs">
                                      <span className="font-medium text-green-800">Dev:</span> {dris.dev_dri}
                                    </div>
                                  )}
                                  {dris.tpm_dri && (
                                    <div className="bg-purple-50 border border-purple-200 px-2 py-1 rounded text-xs">
                                      <span className="font-medium text-purple-800">TPM:</span> {dris.tpm_dri}
                                    </div>
                                  )}
                                  {dris.pm_dri && (
                                    <div className="bg-orange-50 border border-orange-200 px-2 py-1 rounded text-xs">
                                      <span className="font-medium text-orange-800">PM:</span> {dris.pm_dri}
                                    </div>
                                  )}
                                </>
                              );
                            } catch (e) {
                              return <span className="text-xs text-slate-500">Error parsing DRIs</span>;
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <>
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="p-2 text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg"
                          title="Edit release plan"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                          title="Delete release plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Timeline Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'pre_cc_complete_date', label: 'Pre-CC', value: plan.pre_cc_complete_date },
                    { key: 'concept_commit_date', label: 'CC', value: plan.concept_commit_date },
                    { key: 'execute_commit_date', label: 'EC', value: plan.execute_commit_date },
                    { key: 'soft_code_complete_date', label: 'Code Complete', value: plan.soft_code_complete_date },
                    { key: 'commit_gate_met_date', label: 'CG', value: plan.commit_gate_met_date },
                    { key: 'promotion_gate_met_date', label: 'PG', value: plan.promotion_gate_met_date },
                    { key: 'feature_complete_expected_date', label: 'Feature Complete', value: plan.feature_complete_expected_date },
                    { key: 'ga_date', label: 'GA', value: plan.ga_date }
                  ].map((milestone) => {
                    const StatusIcon = getStatusIcon(milestone.value);
                    return (
                      <div
                        key={milestone.key}
                        className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg"
                      >
                        <StatusIcon className={`h-4 w-4 ${getStatusColor(milestone.value)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {milestone.label}
                          </p>
                          <DateHistoryTooltip
                            releasePlanId={plan.id}
                            fieldName={milestone.key}
                            currentValue={milestone.value}
                          >
                            <p className={`text-xs ${getStatusColor(milestone.value)} cursor-help`}>
                              {formatDate(milestone.value)}
                            </p>
                          </DateHistoryTooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Feature QA Need By Date */}
                {plan.feature_qa_need_by_date && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Feature QA Need By: 
                        <DateHistoryTooltip
                          releasePlanId={plan.id}
                          fieldName="feature_qa_need_by_date"
                          currentValue={plan.feature_qa_need_by_date}
                        >
                          <span className="ml-1 cursor-help underline">
                            {formatDate(plan.feature_qa_need_by_date)}
                          </span>
                        </DateHistoryTooltip>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
