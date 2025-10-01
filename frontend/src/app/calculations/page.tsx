'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { api, User, ReleasePlan } from '@/lib/api';
import { holidayService } from '@/lib/holidayService';
import { DEFAULTS } from '@/lib/defaults';
import { availabilityAgent, AvailabilityAnalysis } from '@/lib/availabilityAgent';
import { 
  Calculator, 
  Calendar, 
  Clock, 
  Users, 
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  ArrowRight,
  Database
} from 'lucide-react';

interface CalculationResult {
  // Ideal dates (using default values for display)
  idealGaDate: string;
  idealPromotionGateMetDate: string;
  idealCommitGateMetDate: string;
  idealSoftCodeCompleteDate: string;
  idealExecuteCommitDate: string;
  idealConceptCommitDate: string;
  idealPreCcCompleteDate: string;
  
  // Actual dates (user-entered values used for calculations)
  actualGaDate: string;
  actualPromotionGateMetDate: string;
  actualCommitGateMetDate: string;
  actualSoftCodeCompleteDate: string;
  actualExecuteCommitDate: string;
  actualConceptCommitDate: string;
  actualPreCcCompleteDate: string;
  
  // Calculation results
  numberOfWorkingDaysPerEngineer: number;
  numberOfDaysAvailableToCodeComplete: number;
  hackathonDays: number;
  numberOfHolidays: number;
  availableVacations: number;
  totalDaysAvailableForCodeComplete: number;
  totalAvailableDays: number;
  
  // Vacation breakdown
  totalVacations: number;
  codeCompleteVacations: number;
  afterCodeCompleteVacations: number;
  
  // Holiday breakdown
  codeCompleteHolidays: number;
  afterCodeCompleteHolidays: number;
  
  // Working days between gates
  workingDaysBetweenPromotionGateAndGA: number;
  workingDaysBetweenCommitGateAndPromotionGate: number;
  workingDaysBetweenSoftCodeCompleteAndCommitGate: number;
  workingDaysBetweenExecuteCommitAndSoftCodeComplete: number;
  workingDaysBetweenConceptCommitAndExecuteCommit: number;
  workingDaysBetweenPreCcCompleteAndConceptCommit: number;
}

export default function CalculationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasePlans, setReleasePlans] = useState<ReleasePlan[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string>('');
  const [calculations, setCalculations] = useState<CalculationResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AvailabilityAnalysis | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateGaps, setDateGaps] = useState<{
    gaToPromotionGate: number;
    promotionGateToCommitGate: number;
    commitGateToSoftCodeComplete: number;
    softCodeCompleteToExecuteCommit: number;
    executeCommitToConceptCommit: number;
    conceptCommitToPreCC: number;
  }>(DEFAULTS.DATE_GAPS);
  const [frozenDates, setFrozenDates] = useState<{
    gaDate: string;
    promotionGateMetDate: string;
    commitGateMetDate: string;
    softCodeCompleteDate: string;
    executeCommitDate: string;
    conceptCommitDate: string;
    preCcCompleteDate: string;
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
      codeCompleteHolidays: number;
      afterCodeCompleteHolidays: number;
      workingDaysBetweenPromotionGateAndGA: number;
      workingDaysBetweenCommitGateAndPromotionGate: number;
      workingDaysBetweenSoftCodeCompleteAndCommitGate: number;
      workingDaysBetweenExecuteCommitAndSoftCodeComplete: number;
      workingDaysBetweenConceptCommitAndExecuteCommit: number;
      workingDaysBetweenPreCcCompleteAndConceptCommit: number;
    };
  } | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [datesJustFrozen, setDatesJustFrozen] = useState(false);

  // Load frozen dates from localStorage for the current release plan
  const loadFrozenDates = (releaseId: string) => {
    try {
      const stored = localStorage.getItem(`frozen-dates-${releaseId}`);
      if (stored) {
        setFrozenDates(JSON.parse(stored));
      } else {
        setFrozenDates(null);
      }
    } catch (error) {
      console.error('Error loading frozen dates:', error);
      setFrozenDates(null);
    }
  };

  // Load date gaps configuration
  const loadDateGapsConfig = async () => {
    try {
      const config = await api.getDateGapsConfig();
      setDateGaps(config);
      console.log('Loaded date gaps configuration:', config);
    } catch (error) {
      console.error('Error loading date gaps configuration:', error);
      // Keep default values if loading fails
    }
  };

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

    fetchUserProfile();
    loadDateGapsConfig();
  }, []);

  // Load frozen dates when selected release changes
  useEffect(() => {
    if (selectedReleaseId) {
      loadFrozenDates(selectedReleaseId);
    } else {
      setFrozenDates(null);
    }
  }, [selectedReleaseId]);

  useEffect(() => {
    const loadReleasePlans = async () => {
      try {
        const releasePlansData = await api.getReleasePlans();
        setReleasePlans(releasePlansData);
      } catch (error) {
        console.error('Error loading release plans:', error);
      }
    };

    if (user) {
      loadReleasePlans();
    }
  }, [user]);

  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  };

  const getHackathonDays = (year: number): number => {
    // Hackathon is always in February
    return 3;
  };

  const getHackathonDaysForPeriod = (startDate: Date, endDate: Date): number => {
    // Hackathon days are always in February (Tuesday, Wednesday, Thursday of first week)
    // Check if the project period includes February of any year
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    let hackathonDays = 0;
    
    // Check each year in the range
    for (let year = startYear; year <= endYear; year++) {
      // Calculate hackathon dates for this year
      const hackathonDates = getHackathonDatesForYear(year);
      
      // Check if any hackathon dates fall within the project period
      hackathonDates.forEach(date => {
        if (date >= startDate && date <= endDate) {
          hackathonDays++;
        }
      });
    }
    
    console.log('Hackathon days calculation:', {
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      startYear,
      endYear,
      hackathonDays
    });
    
    return hackathonDays;
  };

  const getHackathonDatesForYear = (year: number): Date[] => {
    // Calculate hackathon dates (Tuesday, Wednesday, Thursday of first week of February)
    const firstDayOfFeb = new Date(year, 1, 1); // Month is 0-indexed, so 1 is February
    let currentDay = new Date(firstDayOfFeb);

    // Find the first Tuesday of February
    while (currentDay.getDay() !== 2) { // 2 is Tuesday
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    const tuesday = new Date(currentDay);
    const wednesday = new Date(currentDay);
    wednesday.setDate(wednesday.getDate() + 1);
    const thursday = new Date(currentDay);
    thursday.setDate(thursday.getDate() + 2);

    return [tuesday, wednesday, thursday];
  };

  const getHolidays = async (startDate: Date, endDate: Date): Promise<number> => {
    // Use AI-powered holiday calculation service
    return await holidayService.countHolidaysInRange(startDate, endDate, 'US');
  };

  const getVacationDays = (startDate: Date, endDate: Date): number => {
    // NDB vacation policy: 18 paid leave days per year, 9 days per release cycle
    // NDB has 2 releases per year (May and November, second Tuesday)
    // Each release cycle is approximately 6 months (EC to Next Release EC)
    // Total 30 days off per year (18 paid leave + 3 wellness + 9 other holidays)
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = totalDays / 30; // Approximate months
    
    // Calculate paid vacation days based on NDB release cycle
    // 9 paid leave days per 6-month release cycle (EC to Next Release EC)
    const vacationDays = Math.round((months / DEFAULTS.VACATION_POLICY.cycleDurationMonths) * DEFAULTS.VACATION_POLICY.daysPerReleaseCycle);
    
    console.log('NDB Vacation calculation (Paid Leave Only):', {
      startDate: startDate.toDateString(),
      endDate: endDate.toDateString(),
      totalDays,
      months,
      releaseCycles: months / 6,
      calculatedVacationDays: vacationDays,
      finalVacationDays: Math.min(Math.max(vacationDays, 0), DEFAULTS.VACATION_POLICY.paidLeaveDays),
      policy: '18 paid leave days/year, 9 per release cycle'
    });
    
    // Cap at 18 paid leave days per year maximum (2 release cycles)
    return Math.min(Math.max(vacationDays, 0), DEFAULTS.VACATION_POLICY.paidLeaveDays);
  };

  const getVacationDaysForPeriod = (startDate: Date, endDate: Date, totalPeriodStart: Date, totalPeriodEnd: Date): number => {
    // Calculate vacation days proportionally based on the period's duration within the total project timeline
    const totalDays = Math.ceil((totalPeriodEnd.getTime() - totalPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get total vacation days for the entire project period
    const totalVacationDays = getVacationDays(totalPeriodStart, totalPeriodEnd);
    
    // Calculate proportional vacation days for this specific period
    const proportionalVacationDays = Math.round((periodDays / totalDays) * totalVacationDays);
    
    console.log('Proportional vacation calculation:', {
      periodStart: startDate.toDateString(),
      periodEnd: endDate.toDateString(),
      totalPeriodStart: totalPeriodStart.toDateString(),
      totalPeriodEnd: totalPeriodEnd.toDateString(),
      periodDays,
      totalDays,
      totalVacationDays,
      proportionalVacationDays,
      finalVacationDays: Math.max(0, proportionalVacationDays)
    });
    
    return Math.max(0, proportionalVacationDays);
  };

  // Date validation function to check if dates match configured gaps
  const validateDateGaps = (dates: {
    gaDate?: Date;
    promotionGateDate?: Date;
    commitGateDate?: Date;
    softCodeCompleteDate?: Date;
    executeCommitDate?: Date;
    conceptCommitDate?: Date;
    preCcCompleteDate?: Date;
  }) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Helper function to calculate weeks between dates
    const getWeeksBetween = (date1: Date, date2: Date): number => {
      const diffTime = Math.abs(date2.getTime() - date1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.round(diffDays / 7);
    };

    // Validate GA to Promotion Gate
    if (dates.gaDate && dates.promotionGateDate) {
      const actualWeeks = getWeeksBetween(dates.gaDate, dates.promotionGateDate);
      const expectedWeeks = dateGaps.gaToPromotionGate;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`GA to Promotion Gate: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    // Validate Promotion Gate to Commit Gate
    if (dates.promotionGateDate && dates.commitGateDate) {
      const actualWeeks = getWeeksBetween(dates.promotionGateDate, dates.commitGateDate);
      const expectedWeeks = dateGaps.promotionGateToCommitGate;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`Promotion Gate to Commit Gate: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    // Validate Commit Gate to Soft Code Complete
    if (dates.commitGateDate && dates.softCodeCompleteDate) {
      const actualWeeks = getWeeksBetween(dates.commitGateDate, dates.softCodeCompleteDate);
      const expectedWeeks = dateGaps.commitGateToSoftCodeComplete;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`Commit Gate to Soft Code Complete: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    // Validate Soft Code Complete to Execute Commit
    if (dates.softCodeCompleteDate && dates.executeCommitDate) {
      const actualWeeks = getWeeksBetween(dates.softCodeCompleteDate, dates.executeCommitDate);
      const expectedWeeks = dateGaps.softCodeCompleteToExecuteCommit;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`Soft Code Complete to Execute Commit: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    // Validate Execute Commit to Concept Commit
    if (dates.executeCommitDate && dates.conceptCommitDate) {
      const actualWeeks = getWeeksBetween(dates.executeCommitDate, dates.conceptCommitDate);
      const expectedWeeks = dateGaps.executeCommitToConceptCommit;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`Execute Commit to Concept Commit: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    // Validate Concept Commit to Pre-CC Complete
    if (dates.conceptCommitDate && dates.preCcCompleteDate) {
      const actualWeeks = getWeeksBetween(dates.conceptCommitDate, dates.preCcCompleteDate);
      const expectedWeeks = dateGaps.conceptCommitToPreCC;
      if (actualWeeks !== expectedWeeks) {
        warnings.push(`Concept Commit to Pre-CC Complete: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
      }
    }

    return { warnings, errors };
  };

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

  const calculateIdealDates = (gaDate: Date) => {
    // If frozen dates exist, use them as the new baseline
    if (frozenDates) {
      return {
        idealGaDate: frozenDates.gaDate,
        idealPromotionGateMetDate: frozenDates.promotionGateMetDate || 'TBD',
        idealCommitGateMetDate: frozenDates.commitGateMetDate || 'TBD',
        idealSoftCodeCompleteDate: frozenDates.softCodeCompleteDate,
        idealExecuteCommitDate: frozenDates.executeCommitDate,
        idealConceptCommitDate: frozenDates.conceptCommitDate || 'TBD',
        idealPreCcCompleteDate: frozenDates.preCcCompleteDate || 'TBD'
      };
    }
    
    // Use the actual GA date as the baseline for ideal dates
    const idealGaDate = new Date(gaDate);
    
    // Calculate ideal dates based on configured gate gaps (in weeks)
    // Promotion Gate: configured weeks before GA
    const idealPromotionGateDate = new Date(idealGaDate);
    idealPromotionGateDate.setDate(idealPromotionGateDate.getDate() - (dateGaps.gaToPromotionGate * 7));
    
    // Commit Gate: configured weeks before Promotion Gate
    const idealCommitGateDate = new Date(idealPromotionGateDate);
    idealCommitGateDate.setDate(idealCommitGateDate.getDate() - (dateGaps.promotionGateToCommitGate * 7));
    
    // Soft Code Complete: configured weeks before Commit Gate
    const idealCodeCompleteDate = new Date(idealCommitGateDate);
    idealCodeCompleteDate.setDate(idealCodeCompleteDate.getDate() - (dateGaps.commitGateToSoftCodeComplete * 7));
    
    // Execute Commit: configured weeks before Soft Code Complete
    const idealExecuteCommitDate = new Date(idealCodeCompleteDate);
    idealExecuteCommitDate.setDate(idealExecuteCommitDate.getDate() - (dateGaps.softCodeCompleteToExecuteCommit * 7));
    
    // Concept Commit: configured weeks before Execute Commit
    const idealConceptCommitDate = new Date(idealExecuteCommitDate);
    idealConceptCommitDate.setDate(idealExecuteCommitDate.getDate() - (dateGaps.executeCommitToConceptCommit * 7));
    
    // Pre-CC Complete: configured weeks before Concept Commit
    const idealPreCcCompleteDate = new Date(idealConceptCommitDate);
    idealPreCcCompleteDate.setDate(idealConceptCommitDate.getDate() - (dateGaps.conceptCommitToPreCC * 7));
    
    return {
      idealGaDate: idealGaDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealPromotionGateMetDate: idealPromotionGateDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealCommitGateMetDate: idealCommitGateDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealSoftCodeCompleteDate: idealCodeCompleteDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealExecuteCommitDate: idealExecuteCommitDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealConceptCommitDate: idealConceptCommitDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      idealPreCcCompleteDate: idealPreCcCompleteDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    };
  };

  const performCalculations = async () => {
    if (!selectedReleaseId) {
      setError('Please select a release plan');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const selectedPlan = releasePlans.find(plan => plan.id === selectedReleaseId);
      if (!selectedPlan) {
        setError('Selected release plan not found');
        return;
      }

      // If dates are frozen, show frozen information without calculation
      if (frozenDates) {
        const result: CalculationResult = {
        // Use frozen dates as both ideal and actual
        idealGaDate: frozenDates.gaDate,
        idealPromotionGateMetDate: frozenDates.promotionGateMetDate || 'TBD',
        idealCommitGateMetDate: frozenDates.commitGateMetDate || 'TBD',
        idealSoftCodeCompleteDate: frozenDates.softCodeCompleteDate,
        idealExecuteCommitDate: frozenDates.executeCommitDate,
        idealConceptCommitDate: frozenDates.conceptCommitDate || 'TBD',
        idealPreCcCompleteDate: frozenDates.preCcCompleteDate || 'TBD',
        actualGaDate: frozenDates.gaDate,
        actualPromotionGateMetDate: frozenDates.promotionGateMetDate || 'TBD',
        actualCommitGateMetDate: frozenDates.commitGateMetDate || 'TBD',
        actualSoftCodeCompleteDate: frozenDates.softCodeCompleteDate,
        actualExecuteCommitDate: frozenDates.executeCommitDate,
        actualConceptCommitDate: frozenDates.conceptCommitDate || 'TBD',
        actualPreCcCompleteDate: frozenDates.preCcCompleteDate || 'TBD',
          
          // Use frozen calculation results
          numberOfWorkingDaysPerEngineer: frozenDates.calculations.numberOfWorkingDaysPerEngineer,
          numberOfDaysAvailableToCodeComplete: frozenDates.calculations.numberOfDaysAvailableToCodeComplete,
          hackathonDays: frozenDates.calculations.hackathonDays,
          numberOfHolidays: frozenDates.calculations.numberOfHolidays,
          availableVacations: frozenDates.calculations.availableVacations,
          totalDaysAvailableForCodeComplete: frozenDates.calculations.totalDaysAvailableForCodeComplete,
          totalAvailableDays: frozenDates.calculations.totalAvailableDays,
          
          // Vacation breakdown (use frozen values if available, otherwise calculate)
          totalVacations: frozenDates.calculations.totalVacations || frozenDates.calculations.availableVacations,
          codeCompleteVacations: frozenDates.calculations.codeCompleteVacations || 0,
          afterCodeCompleteVacations: frozenDates.calculations.afterCodeCompleteVacations || 0,
          
          // Holiday breakdown
          codeCompleteHolidays: frozenDates.calculations.codeCompleteHolidays || 0,
          afterCodeCompleteHolidays: frozenDates.calculations.afterCodeCompleteHolidays || 0,
          
          // Working days between gates (from frozen data or calculated)
          workingDaysBetweenPromotionGateAndGA: frozenDates.calculations.workingDaysBetweenPromotionGateAndGA || 0,
          workingDaysBetweenCommitGateAndPromotionGate: frozenDates.calculations.workingDaysBetweenCommitGateAndPromotionGate || 0,
          workingDaysBetweenSoftCodeCompleteAndCommitGate: frozenDates.calculations.workingDaysBetweenSoftCodeCompleteAndCommitGate || 0,
          workingDaysBetweenExecuteCommitAndSoftCodeComplete: frozenDates.calculations.workingDaysBetweenExecuteCommitAndSoftCodeComplete || 0,
          workingDaysBetweenConceptCommitAndExecuteCommit: frozenDates.calculations.workingDaysBetweenConceptCommitAndExecuteCommit || 0,
          workingDaysBetweenPreCcCompleteAndConceptCommit: frozenDates.calculations.workingDaysBetweenPreCcCompleteAndConceptCommit || 0
        };

        setCalculations(result);
        setCalculating(false);
        return;
      }

      // Parse actual dates (user-entered values)
      const actualExecuteCommitDate = new Date(selectedPlan.execute_commit_date!);
      const actualGaDate = new Date(selectedPlan.ga_date!);
      const actualSoftCodeCompleteDate = new Date(selectedPlan.soft_code_complete_date!);

      // Use NDB standard release dates for calculations
      const year = actualGaDate.getFullYear();
      const month = actualGaDate.getMonth() + 1;
      
      // Determine NDB release cycle
      let ndbGaDate: Date;
      if (month >= 1 && month <= 5) {
        // Spring release (May)
        ndbGaDate = getNDBReleaseDate(year, 5);
      } else if (month >= 6 && month <= 11) {
        // Fall release (November)
        ndbGaDate = getNDBReleaseDate(year, 11);
      } else {
        // December - use next year's May release
        ndbGaDate = getNDBReleaseDate(year + 1, 5);
      }
      
      // Calculate NDB standard dates for calculations
      const ndbCodeCompleteDate = new Date(ndbGaDate);
      ndbCodeCompleteDate.setDate(ndbCodeCompleteDate.getDate() - 14); // 2 weeks before GA
      
      const ndbExecuteCommitDate = new Date(ndbGaDate);
      ndbExecuteCommitDate.setDate(ndbExecuteCommitDate.getDate() - 90); // 3 months before GA

      // Calculate ideal dates from GA date using configured date gaps
      const idealDates = calculateIdealDates(actualGaDate);

      // Validate date gaps against configured values
      const validation = validateDateGaps({
        gaDate: actualGaDate,
        promotionGateDate: selectedPlan.promotion_gate_met_date ? new Date(selectedPlan.promotion_gate_met_date) : undefined,
        commitGateDate: selectedPlan.commit_gate_met_date ? new Date(selectedPlan.commit_gate_met_date) : undefined,
        softCodeCompleteDate: actualSoftCodeCompleteDate,
        executeCommitDate: actualExecuteCommitDate,
        conceptCommitDate: selectedPlan.concept_commit_date ? new Date(selectedPlan.concept_commit_date) : undefined,
        preCcCompleteDate: selectedPlan.pre_cc_complete_date ? new Date(selectedPlan.pre_cc_complete_date) : undefined
      });

      // Log validation warnings
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Date Gap Validation Warnings:', validation.warnings);
      }
      if (validation.errors.length > 0) {
        console.error('❌ Date Gap Validation Errors:', validation.errors);
      }

      // 🤖 Use AI Availability Agent for intelligent calculations
      console.log('🤖 Calling AI Availability Agent...');
      const analysis = await availabilityAgent.analyzeAvailability(
        actualExecuteCommitDate,
        actualSoftCodeCompleteDate,
        actualGaDate
      );
      
      // Store AI analysis for display
      setAiAnalysis(analysis);
      
      // Extract values from AI analysis
      const workingDaysPerEngineer = analysis.totalWorkingDays;
      const daysAvailableToCodeComplete = analysis.availability.daysAvailableToCodeComplete;
      const totalHackathonDays = analysis.deductions.hackathonDays.total;
      const codeCompleteHolidays = analysis.deductions.holidays.codeCompletePeriod;
      const afterCodeCompleteHolidays = analysis.deductions.holidays.afterCodeCompletePeriod;
      const totalHolidays = analysis.deductions.holidays.total;
      const totalVacations = analysis.deductions.vacations.total;
      const codeCompleteVacations = analysis.deductions.vacations.codeCompletePeriod;
      const afterCodeCompleteVacations = analysis.deductions.vacations.afterCodeCompletePeriod;
      const codeCompleteHackathonDays = analysis.deductions.hackathonDays.codeCompletePeriod;
      const afterCodeCompleteHackathonDays = analysis.deductions.hackathonDays.afterCodeCompletePeriod;

      // Debug logging
      console.log('Calculation Debug (Actual Dates for Working Days):', {
        actualExecuteCommitDate: actualExecuteCommitDate.toDateString(),
        actualGaDate: actualGaDate.toDateString(),
        actualSoftCodeCompleteDate: actualSoftCodeCompleteDate.toDateString(),
        workingDaysPerEngineer,
        daysAvailableToCodeComplete,
        totalHackathonDays,
        codeCompleteHackathonDays,
        afterCodeCompleteHackathonDays,
        totalHolidays,
        totalVacations,
        codeCompleteVacations,
        afterCodeCompleteVacations,
        totalProjectDays: Math.ceil((actualGaDate.getTime() - actualExecuteCommitDate.getTime()) / (1000 * 60 * 60 * 24)),
        codeCompleteDays: Math.ceil((actualSoftCodeCompleteDate.getTime() - actualExecuteCommitDate.getTime()) / (1000 * 60 * 60 * 24)),
        afterCodeCompleteDays: Math.ceil((actualGaDate.getTime() - actualSoftCodeCompleteDate.getTime()) / (1000 * 60 * 60 * 24))
      });

      // Use AI analysis results for final calculations
      const totalDaysAvailableForCodeComplete = analysis.availability.daysAvailableToCodeComplete;
      const afterCodeCompleteWorkingDays = analysis.afterCodeCompleteWorkingDays;
      const afterCodeCompleteAvailableDays = analysis.availability.daysAvailableAfterCodeComplete;
      const totalAvailableDays = analysis.availability.totalAvailableDays;

      // Calculate working days between consecutive gates
      const workingDaysBetweenPromotionGateAndGA = selectedPlan.promotion_gate_met_date ? 
        calculateWorkingDays(new Date(selectedPlan.promotion_gate_met_date), actualGaDate) : 0;
      
      const workingDaysBetweenCommitGateAndPromotionGate = selectedPlan.commit_gate_met_date && selectedPlan.promotion_gate_met_date ? 
        calculateWorkingDays(new Date(selectedPlan.commit_gate_met_date), new Date(selectedPlan.promotion_gate_met_date)) : 0;
      
      const workingDaysBetweenSoftCodeCompleteAndCommitGate = selectedPlan.commit_gate_met_date ? 
        calculateWorkingDays(actualSoftCodeCompleteDate, new Date(selectedPlan.commit_gate_met_date)) : 0;
      
      const workingDaysBetweenExecuteCommitAndSoftCodeComplete = 
        calculateWorkingDays(actualExecuteCommitDate, actualSoftCodeCompleteDate);
      
      const workingDaysBetweenConceptCommitAndExecuteCommit = selectedPlan.concept_commit_date ? 
        calculateWorkingDays(new Date(selectedPlan.concept_commit_date), actualExecuteCommitDate) : 0;
      
      const workingDaysBetweenPreCcCompleteAndConceptCommit = selectedPlan.pre_cc_complete_date && selectedPlan.concept_commit_date ? 
        calculateWorkingDays(new Date(selectedPlan.pre_cc_complete_date), new Date(selectedPlan.concept_commit_date)) : 0;

      const result: CalculationResult = {
        // Ideal dates (for display purposes)
        idealGaDate: idealDates.idealGaDate,
        idealPromotionGateMetDate: idealDates.idealPromotionGateMetDate,
        idealCommitGateMetDate: idealDates.idealCommitGateMetDate,
        idealSoftCodeCompleteDate: idealDates.idealSoftCodeCompleteDate,
        idealExecuteCommitDate: idealDates.idealExecuteCommitDate,
        idealConceptCommitDate: idealDates.idealConceptCommitDate,
        idealPreCcCompleteDate: idealDates.idealPreCcCompleteDate,
        
        // Actual dates (user-entered values)
        actualGaDate: actualGaDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        actualPromotionGateMetDate: selectedPlan.promotion_gate_met_date ? new Date(selectedPlan.promotion_gate_met_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'TBD',
        actualCommitGateMetDate: selectedPlan.commit_gate_met_date ? new Date(selectedPlan.commit_gate_met_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'TBD',
        actualSoftCodeCompleteDate: actualSoftCodeCompleteDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        actualExecuteCommitDate: actualExecuteCommitDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        actualConceptCommitDate: selectedPlan.concept_commit_date ? new Date(selectedPlan.concept_commit_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'TBD',
        actualPreCcCompleteDate: selectedPlan.pre_cc_complete_date ? new Date(selectedPlan.pre_cc_complete_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }) : 'TBD',
        
        // Calculation results (based on NDB standard dates)
        numberOfWorkingDaysPerEngineer: workingDaysPerEngineer,
        numberOfDaysAvailableToCodeComplete: daysAvailableToCodeComplete,
        hackathonDays,
        numberOfHolidays: totalHolidays,
        availableVacations: Math.round(totalVacations),
        totalDaysAvailableForCodeComplete: Math.round(totalDaysAvailableForCodeComplete),
        totalAvailableDays: Math.round(totalAvailableDays),
        
        // Vacation breakdown
        totalVacations: Math.round(totalVacations),
        codeCompleteVacations: Math.round(codeCompleteVacations),
        afterCodeCompleteVacations: Math.round(afterCodeCompleteVacations),
        
        // Holiday breakdown
        codeCompleteHolidays: Math.round(codeCompleteHolidays),
        afterCodeCompleteHolidays: Math.round(afterCodeCompleteHolidays),
        
        // Working days between gates
        workingDaysBetweenPromotionGateAndGA,
        workingDaysBetweenCommitGateAndPromotionGate,
        workingDaysBetweenSoftCodeCompleteAndCommitGate,
        workingDaysBetweenExecuteCommitAndSoftCodeComplete,
        workingDaysBetweenConceptCommitAndExecuteCommit,
        workingDaysBetweenPreCcCompleteAndConceptCommit
      };

      setCalculations(result);
    } catch (error) {
      console.error('Error performing calculations:', error);
      setError('Failed to perform calculations');
    } finally {
      setCalculating(false);
    }
  };

  const freezeDates = async () => {
    if (!calculations) return;
    
    setFreezing(true);
    try {
      // Parse the actual dates from calculations
      const actualExecuteCommitDate = calculations.actualExecuteCommitDate;
      const actualSoftCodeCompleteDate = calculations.actualSoftCodeCompleteDate;
      const actualGaDate = calculations.actualGaDate;
      
      // Create frozen dates object with calculation results
      const newFrozenDates = {
        gaDate: actualGaDate,
        promotionGateMetDate: calculations.actualPromotionGateMetDate,
        commitGateMetDate: calculations.actualCommitGateMetDate,
        softCodeCompleteDate: actualSoftCodeCompleteDate,
        executeCommitDate: actualExecuteCommitDate,
        conceptCommitDate: calculations.actualConceptCommitDate,
        preCcCompleteDate: calculations.actualPreCcCompleteDate,
        calculations: {
          numberOfWorkingDaysPerEngineer: calculations.numberOfWorkingDaysPerEngineer,
          numberOfDaysAvailableToCodeComplete: calculations.numberOfDaysAvailableToCodeComplete,
          hackathonDays: calculations.hackathonDays,
          numberOfHolidays: calculations.numberOfHolidays,
          availableVacations: calculations.availableVacations,
          totalDaysAvailableForCodeComplete: calculations.totalDaysAvailableForCodeComplete,
          totalAvailableDays: calculations.totalAvailableDays,
          totalVacations: calculations.totalVacations,
          codeCompleteVacations: calculations.codeCompleteVacations,
          afterCodeCompleteVacations: calculations.afterCodeCompleteVacations,
          codeCompleteHolidays: calculations.codeCompleteHolidays,
          afterCodeCompleteHolidays: calculations.afterCodeCompleteHolidays,
          workingDaysBetweenPromotionGateAndGA: calculations.workingDaysBetweenPromotionGateAndGA,
          workingDaysBetweenCommitGateAndPromotionGate: calculations.workingDaysBetweenCommitGateAndPromotionGate,
          workingDaysBetweenSoftCodeCompleteAndCommitGate: calculations.workingDaysBetweenSoftCodeCompleteAndCommitGate,
          workingDaysBetweenExecuteCommitAndSoftCodeComplete: calculations.workingDaysBetweenExecuteCommitAndSoftCodeComplete,
          workingDaysBetweenConceptCommitAndExecuteCommit: calculations.workingDaysBetweenConceptCommitAndExecuteCommit,
          workingDaysBetweenPreCcCompleteAndConceptCommit: calculations.workingDaysBetweenPreCcCompleteAndConceptCommit
        }
      };
      
      // Save to localStorage with release-specific key
      localStorage.setItem(`frozen-dates-${selectedReleaseId}`, JSON.stringify(newFrozenDates));
      
      // Update state
      setFrozenDates(newFrozenDates);
      setDatesJustFrozen(true);
      
      // Show success message
      setError(null);
      
    } catch (error) {
      console.error('Error freezing dates:', error);
      setError('Failed to freeze dates');
    } finally {
      setFreezing(false);
    }
  };

  const unfreezeDates = () => {
    try {
      localStorage.removeItem(`frozen-dates-${selectedReleaseId}`);
      setFrozenDates(null);
      setDatesJustFrozen(false);
      setError(null);
      
      // Recalculate to show default ideal dates
      if (calculations) {
        performCalculations();
      }
    } catch (error) {
      console.error('Error unfreezing dates:', error);
      setError('Failed to unfreeze dates');
    }
  };

  const proceedToCapacityPlanning = () => {
    router.push('/data');
  };

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

  return (
    <Layout 
      user={user || undefined}
      pageHeader={{
        title: "Calculations",
        description: "Calculate working days, holidays, and resource availability for release plans",
        icon: Calculator
      }}
    >
      <div className="space-y-6">
        {/* Release Selection */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Select Release Plan
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a planned release to perform calculations. The system will calculate working days, holidays, and vacation allocations based on NDB's release cycle (May & November, second Tuesday).
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-4">
              <select
                value={selectedReleaseId}
                onChange={(e) => setSelectedReleaseId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a release plan...</option>
                {releasePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.jira_release_name || plan.name} - GA: {plan.ga_date ? new Date(plan.ga_date).toLocaleDateString() : 'N/A'}
                  </option>
                ))}
              </select>
              
              <button
                onClick={performCalculations}
                disabled={!selectedReleaseId || calculating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Calculate working days, holidays, and vacation allocations based on the selected release plan dates"
              >
                {calculating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Calculate
                  </>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Calculation Results */}
        {calculations && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Calculation Results
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Resource availability and timeline calculations based on actual user-entered dates
              </p>
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <strong>Note:</strong> Ideal dates are calculated based on NDB release cycle (May & November, second Tuesday). All calculations (working days, holidays, vacations) are based on the actual dates you entered.
              </div>
              {frozenDates && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <strong>Frozen Dates Active:</strong> Showing frozen calculation results without recalculation. Dates and calculations are locked.
                </div>
              )}
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ideal vs Actual Dates */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                      Ideal vs Actual Dates
                      <span className="text-xs text-gray-500 font-normal">(Ideal: NDB standard dates, Actual: User input)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {/* GA Date */}
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-orange-800">GA Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-orange-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-orange-900">{calculations.idealGaDate}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualGaDate}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Promotion Gate: {calculations.workingDaysBetweenPromotionGateAndGA || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Promotion Gate Met Date */}
                    <div className="bg-teal-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-teal-800">Promotion Gate Met Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-teal-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-teal-900">{calculations.idealPromotionGateMetDate || 'TBD'}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualPromotionGateMetDate || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Commit Gate: {calculations.workingDaysBetweenCommitGateAndPromotionGate || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Commit Gate Met Date */}
                    <div className="bg-cyan-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-cyan-800">Commit Gate Met Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-cyan-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-cyan-900">{calculations.idealCommitGateMetDate || 'TBD'}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualCommitGateMetDate || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Soft Code Complete: {calculations.workingDaysBetweenSoftCodeCompleteAndCommitGate || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Soft Code Complete Date */}
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-purple-800">Soft Code Complete Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-purple-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-purple-900">{calculations.idealSoftCodeCompleteDate}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualSoftCodeCompleteDate}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Execute Commit: {calculations.workingDaysBetweenExecuteCommitAndSoftCodeComplete || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Execute Commit Date */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-blue-800">Execute Commit Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-blue-900">{calculations.idealExecuteCommitDate}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualExecuteCommitDate}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Concept Commit: {calculations.workingDaysBetweenConceptCommitAndExecuteCommit || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Concept Commit Date */}
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-indigo-800">Concept Commit Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-indigo-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-indigo-900">{calculations.idealConceptCommitDate || 'TBD'}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualConceptCommitDate || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Number of working days between Pre-CC Complete: {calculations.workingDaysBetweenPreCcCompleteAndConceptCommit || 'TBD'}
                      </div>
                    </div>
                    
                    {/* Pre-CC Complete Date */}
                    <div className="bg-pink-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-pink-800">Pre-CC Complete Date</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-pink-600 font-medium">Ideal:</span>
                          <span className="ml-2 text-pink-900">{calculations.idealPreCcCompleteDate || 'TBD'}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Actual:</span>
                          <span className="ml-2 text-green-900">{calculations.actualPreCcCompleteDate || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Starting point - no previous gate
                      </div>
                    </div>
                    
                  </div>
                </div>

                {/* Working Days with Deductions */}
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    Working Days & Deductions
                    <span className="text-xs text-gray-500 font-normal">(Monday-Friday, excluding holidays & vacations)</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Number of Working Days Per Engineer</span>
                      <span className="text-sm font-semibold text-gray-900">{calculations.numberOfWorkingDaysPerEngineer}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-600">Days Available to Code Complete</span>
                      <span className="text-sm font-semibold text-gray-900">{calculations.numberOfDaysAvailableToCodeComplete}</span>
                    </div>
                    
                    {/* Deductions */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Deductions</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">Hackathon Days</span>
                          <span className="text-sm font-semibold text-gray-900">{calculations.hackathonDays}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">Number of Holidays</span>
                          <span className="text-sm font-semibold text-gray-900">{calculations.numberOfHolidays}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-600">Available Vacations</span>
                          <span className="text-sm font-semibold text-gray-900">{calculations.availableVacations}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Policy: {DEFAULTS.VACATION_POLICY.paidLeaveDays} paid leave days/year ({DEFAULTS.VACATION_POLICY.daysPerReleaseCycle} per NDB release cycle) + {DEFAULTS.VACATION_POLICY.wellnessDays} wellness days + holidays - Based on EC to Next Release EC period
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Final Calculations - Prominent (Spans both columns) */}
              <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="text-xl font-bold text-purple-900 flex items-center gap-3 mb-6">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                  🎯 Final Calculations
                  </h3>
                  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Code Complete Section */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-purple-100">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Total Days Available for Code Complete for Net-New Features</h4>
                      <span className="text-4xl font-bold text-purple-600">{calculations.totalDaysAvailableForCodeComplete}</span>
                    </div>
                    
                    {/* Code Complete Calculation Breakdown */}
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-purple-700 mb-3">Code Complete Breakdown</h5>
                      <div className="text-xs text-purple-600 space-y-1">
                        <div>Working Days (Execute Commit to Code Complete): {calculations.numberOfDaysAvailableToCodeComplete}</div>
                        <div className="text-red-600">- Hackathon Days: {calculations.hackathonDays}</div>
                        <div className="text-red-600">- Holidays: {calculations.codeCompleteHolidays}</div>
                        <div className="text-red-600">- Vacations (EC to Code Complete): {calculations.codeCompleteVacations}</div>
                        <div className="text-xs text-gray-400 pl-2">  (Based on NDB release cycle: {DEFAULTS.VACATION_POLICY.daysPerReleaseCycle} days per {DEFAULTS.VACATION_POLICY.cycleDurationMonths}-month cycle)</div>
                        <div className="border-t pt-1 mt-2 font-semibold text-purple-800">
                          = Available Days for Code Complete (Net-New Features): {calculations.totalDaysAvailableForCodeComplete}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Available Days Section */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">Total Available Days for Net-New Features</h4>
                      <span className="text-4xl font-bold text-blue-600">{calculations.totalAvailableDays}</span>
                    </div>
                    
                    {/* Total Available Days Calculation Breakdown */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-blue-700 mb-3">Total Available Days After Code Complete to GA</h5>
                      <div className="text-xs text-blue-600 space-y-1">
                        <div className="font-semibold text-blue-800">Code Complete Period (EC to Code Complete): {calculations.totalDaysAvailableForCodeComplete} days</div>
                        <div className="text-gray-500 pl-2">  Working Days: {calculations.numberOfDaysAvailableToCodeComplete}</div>
                        <div className="text-red-600 pl-2">  - Hackathon Days: {calculations.hackathonDays}</div>
                        <div className="text-red-600 pl-2">  - Holidays: {calculations.codeCompleteHolidays}</div>
                        <div className="text-red-600 pl-2">  - Vacations: {calculations.codeCompleteVacations}</div>
                        <div className="text-xs text-gray-400 pl-2">  (Based on NDB release cycle: {DEFAULTS.VACATION_POLICY.daysPerReleaseCycle} days per {DEFAULTS.VACATION_POLICY.cycleDurationMonths}-month cycle)</div>
                        
                        <div className="font-semibold text-blue-800 mt-2">After Code Complete Period (Code Complete to GA): {calculations.totalAvailableDays - calculations.totalDaysAvailableForCodeComplete} days</div>
                        <div className="text-gray-500 pl-2">  Working Days: {Math.ceil((new Date(calculations.actualGaDate).getTime() - new Date(calculations.actualSoftCodeCompleteDate).getTime()) / (1000 * 60 * 60 * 24))}</div>
                        <div className="text-red-600 pl-2">  - Holidays: {calculations.afterCodeCompleteHolidays}</div>
                        <div className="text-red-600 pl-2">  - Vacations: {calculations.afterCodeCompleteVacations}</div>
                        
                        <div className="border-t pt-1 mt-2 font-semibold text-blue-800">
                          = Total Available Days for Net-New Features: {calculations.totalAvailableDays}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

              {/* Freeze Dates Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                      {frozenDates ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-gray-600" />}
                      Date Baseline Management
                  </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {frozenDates 
                        ? `Current actual dates are frozen as the new baseline for this release plan. This locks the current performance as the new ideal for future calculations of this specific release.`
                        : "Freeze current actual dates to use them as the new baseline for this release plan. Each release plan maintains its own frozen state independently."
                      }
                    </p>
                    {frozenDates && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-700">
                          <strong>Frozen for Release:</strong> {selectedReleaseId ? releasePlans.find(p => p.id === selectedReleaseId)?.name || 'Unknown' : 'Unknown'}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    {frozenDates ? (
                      <>
                        <button
                          onClick={unfreezeDates}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:border-transparent flex items-center gap-2"
                        >
                          <Unlock className="h-4 w-4" />
                          Unfreeze Dates
                        </button>
                        <button
                          onClick={proceedToCapacityPlanning}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:border-transparent flex items-center gap-2 font-semibold"
                        >
                          <Database className="h-4 w-4" />
                          Proceed to Capacity Planning
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={freezeDates}
                        disabled={freezing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {freezing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Freezing...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Freeze Dates
                          </>
                        )}
                      </button>
                    )}
                  </div>
                    </div>
                    
                {/* Success message when dates are just frozen */}
                {datesJustFrozen && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="text-sm font-semibold text-green-800">Dates Successfully Frozen!</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Your actual dates are now set as the baseline for future calculations. 
                          You can proceed to capacity planning or unfreeze dates if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Release Plans Message */}
        {releasePlans.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">No Release Plans Found</h3>
                <p className="text-yellow-700 mt-1">
                  You need to create release plans before performing calculations. 
                  <button 
                    onClick={() => router.push('/release-plans')}
                    className="text-yellow-800 underline hover:text-yellow-900 ml-1"
                  >
                    Go to Release Plans
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}