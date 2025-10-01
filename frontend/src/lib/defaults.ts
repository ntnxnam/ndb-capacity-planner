/**
 * Default Configuration Values for NDB Capacity Planner
 * Centralized location for all default values used throughout the application
 */

// Date Gaps Configuration (in weeks)
export const DEFAULT_DATE_GAPS = {
  gaToPromotionGate: 4,
  promotionGateToCommitGate: 4,
  commitGateToSoftCodeComplete: 4,
  softCodeCompleteToExecuteCommit: 4,
  executeCommitToConceptCommit: 4,
  conceptCommitToPreCC: 4
} as const;

// Vacation Policy Configuration
export const VACATION_POLICY = {
  totalAnnualDays: 30, // Total days off per year (including paid leave + wellness days)
  paidLeaveDays: 18, // Paid vacation days
  wellnessDays: 3, // Company wellness days (March, June, September)
  otherDaysOff: 9, // Other company holidays and time off
  daysPerReleaseCycle: 9, // 18 paid leave days / 2 release cycles
  releaseCyclesPerYear: 2,
  cycleDurationMonths: 6
} as const;

// Hackathon Configuration
export const HACKATHON_CONFIG = {
  daysPerYear: 3,
  daysOfWeek: ['Tuesday', 'Wednesday', 'Thursday'],
  month: 'February',
  week: 'first'
} as const;

// NDB Release Cycle Configuration
export const NDB_RELEASE_CONFIG = {
  releasesPerYear: 2,
  months: [5, 11], // May and November
  dayOfWeek: 'Tuesday',
  weekOfMonth: 'second'
} as const;

// Date Field Configuration
export const DEFAULT_DATE_FIELDS = [
  { 
    key: 'ga_date', 
    label: 'GA Date', 
    description: 'General availability release date', 
    isRequired: true, 
    isEnabled: true, 
    priority: 1 
  },
  { 
    key: 'promotion_gate_met_date', 
    label: 'Promotion Gate Met Date', 
    description: 'Date when promotion gate was met', 
    isRequired: false, 
    isEnabled: true, 
    priority: 2 
  },
  { 
    key: 'commit_gate_met_date', 
    label: 'Commit Gate Met Date', 
    description: 'Date when commit gate was met', 
    isRequired: false, 
    isEnabled: true, 
    priority: 3 
  },
  { 
    key: 'soft_code_complete_date', 
    label: 'Soft Code Complete Date', 
    description: 'Date when soft code complete was achieved', 
    isRequired: true, 
    isEnabled: true, 
    priority: 4 
  },
  { 
    key: 'execute_commit_date', 
    label: 'Execute Commit Date', 
    description: 'Date when execute commit was made', 
    isRequired: true, 
    isEnabled: true, 
    priority: 5 
  },
  { 
    key: 'concept_commit_date', 
    label: 'Concept Commit Date', 
    description: 'Date when concept commit was made', 
    isRequired: false, 
    isEnabled: true, 
    priority: 6 
  },
  { 
    key: 'pre_cc_complete_date', 
    label: 'Pre-CC Complete Date', 
    description: 'Date when pre-CC complete was achieved', 
    isRequired: false, 
    isEnabled: true, 
    priority: 7 
  }
] as const;

// Calculation Defaults
export const CALCULATION_DEFAULTS = {
  workingDaysPerWeek: 5,
  workingDaysPerMonth: 22,
  hackathonDaysPerYear: 3,
  vacationDaysPerYear: 30,
  vacationDaysPerReleaseCycle: 15
} as const;

// UI Defaults
export const UI_DEFAULTS = {
  itemsPerPage: 20,
  maxItemsPerPage: 200,
  defaultPageSize: 20,
  paginationSizes: [10, 20, 50, 100, 200]
} as const;

// API Defaults
export const API_DEFAULTS = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_DATE: 'Invalid date format provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  DATE_IN_PAST: 'Date cannot be in the past',
  INVALID_DATE_RANGE: 'Invalid date range provided',
  CALCULATION_ERROR: 'Error performing calculations',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED_SUCCESSFULLY: 'Saved successfully',
  UPDATED_SUCCESSFULLY: 'Updated successfully',
  DELETED_SUCCESSFULLY: 'Deleted successfully',
  CALCULATED_SUCCESSFULLY: 'Calculations completed successfully',
  SYNCED_SUCCESSFULLY: 'Synced successfully'
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_DATE_RANGE_DAYS: 1,
  MAX_DATE_RANGE_DAYS: 3650, // 10 years
  MAX_WEEKS_GAP: 52,
  MIN_WEEKS_GAP: 1
} as const;

// Export all defaults as a single object for easy access
export const DEFAULTS = {
  DATE_GAPS: DEFAULT_DATE_GAPS,
  VACATION_POLICY,
  HACKATHON_CONFIG,
  NDB_RELEASE_CONFIG,
  DATE_FIELDS: DEFAULT_DATE_FIELDS,
  CALCULATION: CALCULATION_DEFAULTS,
  UI: UI_DEFAULTS,
  API: API_DEFAULTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION: VALIDATION_RULES
} as const;

export default DEFAULTS;
