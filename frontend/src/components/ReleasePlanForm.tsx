'use client';

import { useState, useEffect } from 'react';
import { api, ReleasePlan, ReleasePlanSuggestions, JiraRelease, ReleaseDRIs } from '@/lib/api';

// Utility function to format dates as DD/MMM/YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Utility function to convert DD/MMM/YYYY to YYYY-MM-DD for API calls
const parseDateForAPI = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid
  return date.toISOString().split('T')[0];
};
import { Calendar, Lightbulb, Clock, Save, X, Calculator, Users, ExternalLink, Plus, Trash2 } from 'lucide-react';

interface ReleasePlanFormProps {
  plan?: ReleasePlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReleasePlanForm({ plan, onSuccess, onCancel }: ReleasePlanFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    jira_release_id: '',
    release_dris: {
      qa_dri: '',
      dev_dri: '',
      tpm_dri: '',
      pm_dri: ''
    } as ReleaseDRIs,
    pre_cc_complete_date: '',
    concept_commit_date: '',
    execute_commit_date: '',
    soft_code_complete_date: '',
    commit_gate_met_date: '',
    promotion_gate_met_date: '',
    ga_date: ''
  });

  const [suggestions, setSuggestions] = useState<ReleasePlanSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [jiraReleases, setJiraReleases] = useState<JiraRelease[]>([]);
  const [jiraStatus, setJiraStatus] = useState({ configured: false, connected: false });
  const [loadingJira, setLoadingJira] = useState(true);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 JIRA state changed:', { 
      configured: jiraStatus.configured, 
      connected: jiraStatus.connected, 
      releasesCount: jiraReleases.length,
      loadingJira 
    });
  }, [jiraStatus, jiraReleases, loadingJira]);

  // Initialize form data if editing existing plan
  useEffect(() => {
    if (plan) {
      const existingDris = plan.release_dris ? JSON.parse(plan.release_dris) : {};
      setFormData({
        name: plan.name,
        description: plan.description || '',
        jira_release_id: plan.jira_release_id || '',
        release_dris: {
          qa_dri: existingDris.qa_dri || '',
          dev_dri: existingDris.dev_dri || '',
          tpm_dri: existingDris.tpm_dri || '',
          pm_dri: existingDris.pm_dri || ''
        },
        pre_cc_complete_date: plan.pre_cc_complete_date?.split('T')[0] || '',
        concept_commit_date: plan.concept_commit_date?.split('T')[0] || '',
        execute_commit_date: plan.execute_commit_date?.split('T')[0] || '',
        soft_code_complete_date: plan.soft_code_complete_date?.split('T')[0] || '',
        commit_gate_met_date: plan.commit_gate_met_date?.split('T')[0] || '',
        promotion_gate_met_date: plan.promotion_gate_met_date?.split('T')[0] || '',
        ga_date: plan.ga_date?.split('T')[0] || ''
      });
    }
  }, [plan]);

  // Load JIRA data on component mount
  useEffect(() => {
    console.log('🚀 ReleasePlanForm mounted, loading JIRA data...');
    loadJiraData();
  }, []);

  const loadJiraData = async () => {
    try {
      console.log('🔄 Loading JIRA data for release plan form...');
      setLoadingJira(true);
      
      // Check JIRA status
      const statusResponse = await api.getJiraStatus();
      console.log('📊 JIRA status response:', statusResponse);
      
      if (statusResponse.success) {
        const status = statusResponse.data;
        console.log('📊 JIRA status data:', status);
        
        setJiraStatus({
          configured: status.configured,
          connected: status.connection_status === 'connected'
        });
        
        // Load releases if JIRA is configured and connected
        if (status.configured && status.connection_status === 'connected') {
          console.log('🔄 Loading JIRA releases for dropdown...');
          const releases = await api.getJiraReleasesForReleasePlans();
          console.log('📊 JIRA releases loaded:', releases);
          
          // Filter out "Era Future" and "master" releases
          const filteredReleases = releases.filter(release => 
            release.name !== 'Era Future' && release.name !== 'master'
          );
          console.log('📊 Filtered JIRA releases:', filteredReleases);
          setJiraReleases(filteredReleases);
        } else {
          console.log('❌ JIRA not configured or not connected:', { 
            configured: status.configured, 
            connection_status: status.connection_status 
          });
          
          // Fallback: Try to load releases anyway if we have some in the database
          if (status.configured) {
            console.log('🔄 Trying to load releases despite connection issues...');
            try {
              const releases = await api.getJiraReleasesForReleasePlans();
              if (releases && releases.length > 0) {
                console.log('📊 JIRA releases loaded from fallback:', releases);
                
                // Filter out "Era Future" and "master" releases
                const filteredReleases = releases.filter(release => 
                  release.name !== 'Era Future' && release.name !== 'master'
                );
                console.log('📊 Filtered JIRA releases from fallback:', filteredReleases);
                setJiraReleases(filteredReleases);
                setJiraStatus(prev => ({ ...prev, connected: true }));
              }
            } catch (fallbackError) {
              console.log('❌ Fallback also failed:', fallbackError);
            }
          }
        }
      } else {
        console.log('❌ JIRA status response failed:', statusResponse);
      }
    } catch (error) {
      console.error('❌ Error loading JIRA data:', error);
    } finally {
      setLoadingJira(false);
    }
  };

  // Auto-calculate Feature QA Need By Date when Soft Code Complete changes
  const featureQaNeedByDate = formData.soft_code_complete_date;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle JIRA release selection for name field
    if (name === 'name' && jiraStatus.configured && jiraStatus.connected) {
      const selectedRelease = jiraReleases.find(r => r.name === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        jira_release_id: selectedRelease?.id || prev.jira_release_id,
        description: selectedRelease?.description || prev.description
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleJiraReleaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const releaseId = e.target.value;
    const selectedRelease = jiraReleases.find(r => r.id === releaseId);
    
    setFormData(prev => ({
      ...prev,
      jira_release_id: releaseId,
      name: selectedRelease?.name || prev.name,
      description: selectedRelease?.description || prev.description
    }));
  };

  const handleDriChange = (driType: keyof ReleaseDRIs, value: string) => {
    setFormData(prev => ({
      ...prev,
      release_dris: {
        ...prev.release_dris,
        [driType]: value
      }
    }));
  };

  const generateSuggestions = async () => {
    if (!formData.ga_date) {
      alert('Please enter a GA date first to generate suggestions');
      return;
    }

    try {
      setLoading(true);
      const dateSuggestions = await api.getDateSuggestions(formData.ga_date);
      setSuggestions(dateSuggestions);
      setShowSuggestions(true);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.code === 'INVALID_GA_DATE') {
          alert('Error: GA date cannot be in the past. Please select a future date.');
        } else if (errorData.code === 'VALIDATION_ERROR') {
          alert(`Validation Error: ${errorData.details?.[0]?.message || 'Invalid date format'}`);
        } else {
          alert(`Error: ${errorData.error || 'Invalid date format'}`);
        }
      } else {
        alert('Failed to generate date suggestions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (field: keyof ReleasePlanSuggestions) => {
    if (!suggestions) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: suggestions[field]
    }));
  };

  const applyAllSuggestions = () => {
    if (!suggestions) return;
    
    setFormData(prev => ({
      ...prev,
      pre_cc_complete_date: suggestions.pre_cc_complete_date,
      concept_commit_date: suggestions.concept_commit_date,
      execute_commit_date: suggestions.execute_commit_date,
      soft_code_complete_date: suggestions.soft_code_complete_date,
      commit_gate_met_date: suggestions.commit_gate_met_date,
      promotion_gate_met_date: suggestions.promotion_gate_met_date,
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a release plan name');
      return;
    }

    // Validate required DRIs
    if (formData.release_dris.qa_dri || formData.release_dris.dev_dri || formData.release_dris.tpm_dri || formData.release_dris.pm_dri) {
      if (!formData.release_dris.qa_dri?.trim()) {
        alert('QA DRI is required when adding DRIs');
        return;
      }
      if (!formData.release_dris.dev_dri?.trim()) {
        alert('Dev DRI is required when adding DRIs');
        return;
      }
      if (!formData.release_dris.tpm_dri?.trim()) {
        alert('TPM DRI is required when adding DRIs');
        return;
      }
    }

    try {
      setSubmitting(true);
      
      // Prepare DRIs for submission
      const hasAnyDri = formData.release_dris.qa_dri || formData.release_dris.dev_dri || 
                       formData.release_dris.tpm_dri || formData.release_dris.pm_dri;
      
      const planData = {
        ...formData,
        description: formData.description || undefined,
        jira_release_id: formData.jira_release_id || undefined,
        release_dris: hasAnyDri ? {
          qa_dri: formData.release_dris.qa_dri,
          dev_dri: formData.release_dris.dev_dri,
          tpm_dri: formData.release_dris.tpm_dri,
          pm_dri: formData.release_dris.pm_dri || undefined
        } : undefined,
        pre_cc_complete_date: formData.pre_cc_complete_date || undefined,
        concept_commit_date: formData.concept_commit_date || undefined,
        execute_commit_date: formData.execute_commit_date || undefined,
        soft_code_complete_date: formData.soft_code_complete_date || undefined,
        commit_gate_met_date: formData.commit_gate_met_date || undefined,
        promotion_gate_met_date: formData.promotion_gate_met_date || undefined,
        ga_date: formData.ga_date || undefined
      };

      if (plan) {
        await api.updateReleasePlan(plan.id, planData);
      } else {
        await api.createReleasePlan(planData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving release plan:', error);
      alert('Failed to save release plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Default date fields - will be overridden by configuration
  const defaultDateFields = [
    { key: 'ga_date', label: 'GA Date', description: 'General availability release date', priority: 1, isRequired: true, isEnabled: true },
    { key: 'promotion_gate_met_date', label: 'Promotion Gate Met Date', description: 'Promotion gate milestone date', priority: 2, isRequired: true, isEnabled: true },
    { key: 'commit_gate_met_date', label: 'Commit Gate Met Date', description: 'Commit gate milestone date', priority: 3, isRequired: true, isEnabled: true },
    { key: 'soft_code_complete_date', label: 'Soft Code Complete Date', description: 'Soft code completion date', priority: 4, isRequired: true, isEnabled: true },
    { key: 'execute_commit_date', label: 'Execute Commit Date', description: 'Execution commitment date', priority: 5, isRequired: true, isEnabled: true },
    { key: 'concept_commit_date', label: 'Concept Commit Date', description: 'Concept commitment date', priority: 6, isRequired: true, isEnabled: true },
    { key: 'pre_cc_complete_date', label: 'Pre-CC Complete Date', description: 'Pre-concept commit completion date', priority: 7, isRequired: true, isEnabled: true }
  ];

  const [dateFields, setDateFields] = useState(defaultDateFields);

  // Load date fields configuration
  useEffect(() => {
    const loadDateFieldsConfig = async () => {
      try {
        // TODO: Replace with actual API call when backend is ready
        // const config = await api.getDateFieldsConfig();
        // setDateFields(config);
        
        // For now, use default fields
        setDateFields(defaultDateFields);
      } catch (error) {
        console.error('Error loading date fields configuration:', error);
        setDateFields(defaultDateFields);
      }
    };

    loadDateFieldsConfig();
  }, []);

  // Filter to only show enabled fields
  const enabledDateFields = dateFields.filter(field => field.isEnabled);

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {plan ? 'Edit Release Plan' : 'Create New Release Plan'}
        </h2>
        <div className="flex space-x-2">
          {/* Generate suggestions button moved to Release Milestones section */}
        </div>
      </div>


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* JIRA Integration Section */}
        {jiraStatus.configured && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <ExternalLink className="h-5 w-5" />
              <span>JIRA Integration</span>
              {!jiraStatus.connected && (
                <span className="text-sm text-red-600 font-normal">(Connection Error)</span>
              )}
            </h3>
            
            {jiraStatus.connected ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">JIRA Connected</span>
                </div>
                <p className="text-sm text-green-700">
                  ✓ JIRA releases are now available in the Release Plan Name dropdown above
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Selecting a release will auto-populate the release name, ID, and description
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  JIRA connection failed. Please check your configuration and credentials.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Release Plan Name *
            </label>
            {(() => {
              const shouldShowDropdown = jiraStatus.configured && jiraStatus.connected && jiraReleases.length > 0;
              console.log('🔍 JIRA status check:', { 
                configured: jiraStatus.configured, 
                connected: jiraStatus.connected,
                loadingJira,
                releasesCount: jiraReleases.length,
                shouldShowDropdown
              });
              return shouldShowDropdown;
            })() ? (
              <div className="space-y-2">
                <select
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={loadingJira}
                >
                  <option value="">Select a JIRA release...</option>
                  {jiraReleases.map((release) => (
                    <option key={release.id} value={release.name}>
                      {release.name} {release.description && `- ${release.description}`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Select from available JIRA releases. This will auto-populate the release name and ID.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter release plan name (e.g., v2.5.0 Release Plan)"
                  required
                />
                <p className="text-xs text-slate-500">
                  {jiraStatus.configured 
                    ? "JIRA connection failed. Enter release plan name manually."
                    : "JIRA not configured. Enter release plan name manually."
                  }
                </p>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter release plan description..."
            />
          </div>
        </div>

        {/* DRIs Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Release DRIs (Data Responsible Individuals)</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QA DRI - Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                QA DRI *
                <span className="text-red-500 ml-1">Required</span>
              </label>
              <input
                type="text"
                value={formData.release_dris.qa_dri}
                onChange={(e) => handleDriChange('qa_dri', e.target.value)}
                placeholder="Enter JIRA ID (e.g., namratha.singh)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Quality Assurance responsible person
              </p>
            </div>

            {/* Dev DRI - Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dev DRI *
                <span className="text-red-500 ml-1">Required</span>
              </label>
              <input
                type="text"
                value={formData.release_dris.dev_dri}
                onChange={(e) => handleDriChange('dev_dri', e.target.value)}
                placeholder="Enter JIRA ID (e.g., john.doe)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Development responsible person
              </p>
            </div>

            {/* TPM DRI - Required */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                TPM DRI *
                <span className="text-red-500 ml-1">Required</span>
              </label>
              <input
                type="text"
                value={formData.release_dris.tpm_dri}
                onChange={(e) => handleDriChange('tpm_dri', e.target.value)}
                placeholder="Enter JIRA ID (e.g., jane.smith)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Technical Program Manager responsible person
              </p>
            </div>

            {/* PM DRI - Optional */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PM DRI
                <span className="text-slate-500 ml-1">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.release_dris.pm_dri || ''}
                onChange={(e) => handleDriChange('pm_dri', e.target.value)}
                placeholder="Enter JIRA ID (e.g., product.manager)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500 mt-1">
                Product Manager responsible person
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> QA DRI, Dev DRI, and TPM DRI are required when adding DRIs. PM DRI is optional.
              Use JIRA IDs (e.g., namratha.singh) or email addresses. Future enhancement will integrate with Azure AD for user lookup.
            </p>
          </div>
        </div>

        {/* Date Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Release Milestones</span>
            </h3>
            <button
              type="button"
              onClick={generateSuggestions}
              disabled={loading || !formData.ga_date}
              className="btn-secondary flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>{loading ? 'Generating...' : 'Generate Date Suggestions'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enabledDateFields.map((field, index) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                  {suggestions && (
                    <button
                      type="button"
                      onClick={() => applySuggestion(field.key as keyof ReleasePlanSuggestions)}
                      className="ml-2 text-xs text-amber-600 hover:text-amber-800"
                      title="Apply suggestion"
                    >
                      <Clock className="h-3 w-3 inline" />
                    </button>
                  )}
                </label>
                <input
                  type="date"
                  name={field.key}
                  value={(formData as any)[field.key] || ''}
                  onChange={handleInputChange}
                  required={field.isRequired}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {(formData as any)[field.key] && (
                  <p className="text-sm text-blue-600 font-medium">
                    Display: {formatDate((formData as any)[field.key])}
                  </p>
                )}
                <p className="text-xs text-slate-500">{field.description}</p>
                
                {/* Show suggestions after GA Date field */}
                {field.key === 'ga_date' && showSuggestions && suggestions && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-5 w-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-800">Suggested Dates</h4>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={applyAllSuggestions}
                          className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700"
                        >
                          Apply All
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-sm text-amber-600 hover:text-amber-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {dateFields.slice(1).map((suggestionField) => {
                        const suggestionKey = suggestionField.key as keyof ReleasePlanSuggestions;
                        const suggestionValue = suggestions[suggestionKey];
                        console.log(`Displaying suggestion for ${suggestionKey}:`, suggestionValue);
                        return (
                          <div key={suggestionField.key} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="truncate mr-2">{suggestionField.label.replace(' Date', '')}:</span>
                            <div className="flex items-center space-x-1">
                              <span className="font-medium">{suggestionValue ? formatDate(suggestionValue) : 'No suggestion'}</span>
                              <button
                                type="button"
                                onClick={() => applySuggestion(suggestionKey)}
                                className="text-amber-600 hover:text-amber-800 ml-1"
                              >
                                <Clock className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Calculated Field */}
        {featureQaNeedByDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Calculated Field</h3>
            </div>
            <div className="text-sm">
              <strong>Feature QA Need By Date:</strong> {featureQaNeedByDate}
              <p className="text-blue-600 mt-1">
                This date is automatically set to match the Soft Code Complete Date
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
