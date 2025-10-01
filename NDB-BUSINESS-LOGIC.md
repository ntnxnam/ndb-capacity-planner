# NDB Capacity Planner - Business Logic Documentation

## Overview
This document outlines the specific business logic and rules implemented in the NDB Capacity Planner application, based on NDB's release cycle and operational requirements.

## NDB Release Cycle

### Release Schedule
- **Frequency**: 2 releases per year
- **Timing**: Second Tuesday of May and November
- **Cycle Duration**: Approximately 6 months per release cycle (EC to Next Release EC)

### Release Date Calculation
```typescript
const getNDBReleaseDate = (year: number, month: number): Date => {
  // NDB releases happen on second Tuesday of May and November
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const firstTuesday = new Date(firstDayOfMonth);
  
  // Find first Tuesday of the month
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToAdd = (2 - dayOfWeek + 7) % 7; // Tuesday is day 2
  firstTuesday.setDate(firstDayOfMonth.getDate() + daysToAdd);
  
  // Second Tuesday is 7 days later
  const secondTuesday = new Date(firstTuesday);
  secondTuesday.setDate(firstTuesday.getDate() + 7);
  
  return secondTuesday;
};
```

### Ideal Date Calculation
When no release plan exists, the system calculates ideal dates based on:
1. **Current date analysis**: Determines which NDB release cycle the current date falls into
2. **Spring release (Jan-May)**: Uses May second Tuesday of current year
3. **Fall release (Jun-Nov)**: Uses November second Tuesday of current year
4. **December**: Uses May second Tuesday of next year

### Gate Gaps (Default Configuration)
- **Execute Commit to Code Complete**: 90 days (3 months)
- **Code Complete to GA**: 14 days (2 weeks)
- **Total Release Cycle**: 104 days (approximately 3.5 months)

## Vacation Policy

### NDB Vacation Rules
- **Total Annual Allocation**: 30 days per year
- **Per Release Cycle**: 15 days per 6-month release cycle
- **Calculation Basis**: EC to Next Release EC period (not calendar halves)
- **Proportional Distribution**: Vacation days are split proportionally between:
  - EC to Code Complete period
  - Code Complete to GA period

### Vacation Calculation Logic
```typescript
const getVacationDays = (startDate: Date, endDate: Date): number => {
  // NDB vacation policy: 30 days per year, 15 days per release cycle
  // NDB has 2 releases per year (May and November, second Tuesday)
  // Each release cycle is approximately 6 months (EC to Next Release EC)
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const months = totalDays / 30; // Approximate months
  
  // Calculate vacation days based on NDB release cycle
  // 15 days per 6-month release cycle (EC to Next Release EC)
  const vacationDays = Math.round((months / 6) * 15);
  
  // Cap at 30 days per year maximum (2 release cycles)
  return Math.min(Math.max(vacationDays, 0), 30);
};
```

## Holiday Calculation

### Holiday Sources
The system includes comprehensive holiday calculations covering:
- **US Federal Holidays**: New Year's Day, MLK Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas
- **Indian Festivals**: Makar Sankranti, Holi, Eid al-Fitr, Janmashtami, Ganesh Chaturthi, Dussehra, Diwali, Bhai Dooj, Guru Nanak Jayanti
- **Company-Specific**: Year-end slowdown days (Dec 20-31)

### Holiday Service
```typescript
// Uses AI-powered holiday calculation service
const getHolidays = async (startDate: Date, endDate: Date): Promise<number> => {
  return await holidayService.countHolidaysInRange(startDate, endDate, 'US');
};
```

## Working Days Calculation

### Business Rules
- **Working Days**: Monday through Friday (excluding weekends)
- **Hackathon Days**: 3 days per year (deducted from working days)
- **Holiday Deductions**: All recognized holidays are deducted
- **Vacation Deductions**: Calculated based on NDB release cycle

### Calculation Formula
```
Total Available Days = Working Days - Hackathon Days - Holidays - Vacations
```

## Data Storage

### Database Tables
- **jira_components**: Stores ERA project components from JIRA
- **jira_assignees**: Stores assignable users from JIRA
- **jira_releases**: Stores release information from JIRA
- **release_plans**: Stores user-created release plans
- **audit_logs**: Tracks all system activities

### Caching Strategy
- **JIRA Data**: Stored in database, not localStorage
- **Frozen Dates**: Stored in localStorage for persistence
- **Calculation Results**: Cached in component state

## UI/UX Guidelines

### Help Text Requirements
- **Every page**: Should have contextual help explaining the page's purpose
- **Complex calculations**: Should show breakdown and explanation
- **Form fields**: Should have tooltips or help text for unclear fields
- **Action buttons**: Should have clear labels and optional help text
- **Data tables**: Should have column headers with clear descriptions

### Help Text Placement
- **Page headers**: Brief description of page purpose
- **Calculation sections**: Detailed breakdown of formulas
- **Form sections**: Field-specific help where needed
- **Data displays**: Contextual information for data interpretation

## Configuration Management

### JIRA Integration
- **Authentication**: Bearer token-based authentication
- **Data Sync**: Manual sync via "Load JIRA Data" button
- **Caching**: Database storage for performance
- **Error Handling**: Graceful fallback for API failures

### Release Plan Management
- **Ideal Dates**: Calculated based on NDB release cycle
- **Actual Dates**: User-entered values used for calculations
- **Frozen Dates**: Locked calculations for baseline reference
- **Date History**: Tracks all date changes for audit purposes

## Security and Access Control

### Role-Based Access
- **Superadmin**: Full system access
- **Admin**: Most features except user management
- **User**: Basic calculation and viewing capabilities

### Audit Logging
- **All Actions**: Logged with user, timestamp, and details
- **Data Changes**: Tracked with old/new values
- **API Calls**: Monitored for performance and errors
- **Security Events**: Authentication and authorization events

## Performance Considerations

### Calculation Optimization
- **Cached Results**: Avoid recalculation when possible
- **Frozen Dates**: Skip calculation for locked data
- **Database Queries**: Optimized with proper indexing
- **API Calls**: Minimized through caching

### Error Handling
- **Graceful Degradation**: System continues with reduced functionality
- **User Feedback**: Clear error messages and recovery options
- **Logging**: Comprehensive error tracking for debugging
- **Fallback Values**: Default values when data unavailable

## Freeze/Unfreeze Dates Functionality

### Overview
The freeze/unfreeze dates feature allows users to lock calculation results for a specific release plan, establishing a baseline for future ideal date calculations. This is crucial for NDB's capacity planning as it helps establish realistic timelines based on actual performance.

### How It Works

#### Freeze Dates
- **Trigger**: User clicks "Freeze Dates" button after performing calculations
- **Storage**: Frozen dates are stored per release plan using key `frozen-dates-{releaseId}`
- **Data Stored**:
  - Actual dates (Execute Commit, Code Complete, GA)
  - All calculation results (working days, holidays, vacations, totals)
  - Vacation breakdown (EC to Code Complete, Code Complete to GA)
- **Behavior**: When frozen, calculations are skipped and stored results are displayed

#### Unfreeze Dates
- **Trigger**: User clicks "Unfreeze Dates" button
- **Storage**: Removes frozen data for the specific release plan
- **Behavior**: Recalculates with current actual dates and shows default ideal dates

#### Release-Specific Storage
- **Key Format**: `frozen-dates-{releaseId}` (e.g., `frozen-dates-123`)
- **Isolation**: Each release plan has its own frozen state
- **Switching**: When switching between release plans, frozen state is loaded per plan
- **Persistence**: Frozen state persists across browser sessions

### Implementation Details

#### Storage Structure
```typescript
interface FrozenDates {
  executeCommitDate: string;
  codeCompleteDate: string;
  gaDate: string;
  calculations: {
    numberOfWorkingDaysPerEngineer: number;
    numberOfDaysAvailableToCodeComplete: number;
    hackathonDays: number;
    numberOfHolidays: number;
    availableVacations: number;
    totalDaysAvailableForCodeComplete: number;
    totalAvailableDays: number;
    totalVacations: number;
    codeCompleteVacations: number;
    afterCodeCompleteVacations: number;
  };
}
```

#### Key Functions
- **`loadFrozenDates(releaseId)`**: Loads frozen dates for specific release
- **`freezeDates()`**: Saves current calculations as frozen baseline
- **`unfreezeDates()`**: Removes frozen state and recalculates

#### UI States
- **Not Frozen**: Shows "Freeze Dates" button, performs calculations
- **Frozen**: Shows "Unfreeze Dates" button, displays stored results
- **Loading**: Shows appropriate loading states during operations

### Use Cases

#### Establishing Baselines
1. User creates a release plan with actual dates
2. System calculates working days, holidays, vacations
3. User freezes these results as the new baseline
4. Future ideal date calculations use this baseline

#### Performance Tracking
1. Track actual vs. ideal performance over time
2. Identify trends in development velocity
3. Adjust capacity planning based on historical data

#### Release Planning
1. Use frozen baselines for similar release types
2. Compare different release plans against established baselines
3. Make data-driven decisions about resource allocation

### Best Practices

#### When to Freeze
- After completing a release with actual dates
- When calculation results represent good performance
- Before using results as baseline for future planning

#### When to Unfreeze
- When actual performance significantly differs from frozen baseline
- When release parameters change significantly
- When starting fresh with new planning approach

#### Data Management
- Frozen dates are automatically loaded when switching release plans
- Each release plan maintains its own frozen state
- Frozen data persists across browser sessions
- No limit on number of frozen release plans

## Future Enhancements

### Planned Features
- **Automated JIRA Sync**: Scheduled data synchronization
- **Advanced Analytics**: Trend analysis and forecasting
- **Custom Gate Gaps**: Configurable timing between gates
- **Team Capacity**: Multi-engineer capacity planning
- **Integration APIs**: External system integration capabilities

### Configuration Options
- **Holiday Calendars**: Customizable holiday sets
- **Working Days**: Configurable work week patterns
- **Vacation Policies**: Adjustable vacation allocation rules
- **Release Cycles**: Customizable release timing
