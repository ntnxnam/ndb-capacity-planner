/**
 * AI Availability Agent
 * Intelligently calculates working days, deductions, and availability based on actual project dates
 * This agent analyzes the specific date ranges and applies appropriate deductions
 */

import { holidayService } from './holidayService';
import { DEFAULTS } from './defaults';

export interface AvailabilityAnalysis {
  // Input dates
  executeCommitDate: Date;
  softCodeCompleteDate: Date;
  gaDate: Date;
  
  // Working days calculations
  totalWorkingDays: number;
  codeCompleteWorkingDays: number;
  afterCodeCompleteWorkingDays: number;
  
  // Deductions analysis
  deductions: {
    holidays: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
      breakdown: Array<{ name: string; date: Date; type: string }>;
    };
    hackathonDays: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
      breakdown: Array<{ date: Date; reason: string }>;
    };
    vacations: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
      policy: string;
    };
  };
  
  // Final availability
  availability: {
    daysAvailableToCodeComplete: number;
    daysAvailableAfterCodeComplete: number;
    totalAvailableDays: number;
    efficiency: number; // Percentage of working days available
  };
  
  // AI insights
  insights: string[];
  recommendations: string[];
}

export class AvailabilityAgent {
  private static instance: AvailabilityAgent;
  
  private constructor() {}
  
  public static getInstance(): AvailabilityAgent {
    if (!AvailabilityAgent.instance) {
      AvailabilityAgent.instance = new AvailabilityAgent();
    }
    return AvailabilityAgent.instance;
  }

  /**
   * Main AI analysis method - analyzes availability based on actual project dates
   */
  public async analyzeAvailability(
    executeCommitDate: Date,
    softCodeCompleteDate: Date,
    gaDate: Date
  ): Promise<AvailabilityAnalysis> {
    console.log('🤖 AI Availability Agent: Starting analysis...', {
      executeCommitDate: executeCommitDate.toDateString(),
      softCodeCompleteDate: softCodeCompleteDate.toDateString(),
      gaDate: gaDate.toDateString()
    });

    // Validate dates
    this.validateDates(executeCommitDate, softCodeCompleteDate, gaDate);

    // Calculate working days for each period
    const totalWorkingDays = this.calculateWorkingDays(executeCommitDate, gaDate);
    const codeCompleteWorkingDays = this.calculateWorkingDays(executeCommitDate, softCodeCompleteDate);
    const afterCodeCompleteWorkingDays = this.calculateWorkingDays(softCodeCompleteDate, gaDate);

    // Analyze deductions
    const deductions = await this.analyzeDeductions(
      executeCommitDate,
      softCodeCompleteDate,
      gaDate
    );

    // Calculate final availability
    const availability = this.calculateAvailability(
      codeCompleteWorkingDays,
      afterCodeCompleteWorkingDays,
      deductions
    );

    // Generate AI insights
    const insights = this.generateInsights(
      executeCommitDate,
      softCodeCompleteDate,
      gaDate,
      deductions,
      availability
    );

    const recommendations = this.generateRecommendations(
      executeCommitDate,
      softCodeCompleteDate,
      gaDate,
      deductions,
      availability
    );

    const analysis: AvailabilityAnalysis = {
      executeCommitDate,
      softCodeCompleteDate,
      gaDate,
      totalWorkingDays,
      codeCompleteWorkingDays,
      afterCodeCompleteWorkingDays,
      deductions,
      availability,
      insights,
      recommendations
    };

    console.log('🤖 AI Availability Agent: Analysis complete', {
      totalWorkingDays,
      totalDeductions: deductions.holidays.total + deductions.hackathonDays.total + deductions.vacations.total,
      finalAvailability: availability.totalAvailableDays,
      efficiency: `${availability.efficiency.toFixed(1)}%`
    });

    return analysis;
  }

  /**
   * Calculate working days between two dates (excluding weekends)
   */
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  }

  /**
   * Analyze all deductions (holidays, hackathon days, vacations)
   */
  private async analyzeDeductions(
    executeCommitDate: Date,
    softCodeCompleteDate: Date,
    gaDate: Date
  ) {
    // Get holidays for each period
    const codeCompleteHolidays = await this.getHolidaysForPeriod(executeCommitDate, softCodeCompleteDate);
    const afterCodeCompleteHolidays = await this.getHolidaysForPeriod(softCodeCompleteDate, gaDate);
    
    // Get hackathon days for each period
    const codeCompleteHackathonDays = this.getHackathonDaysForPeriod(executeCommitDate, softCodeCompleteDate);
    const afterCodeCompleteHackathonDays = this.getHackathonDaysForPeriod(softCodeCompleteDate, gaDate);
    
    // Get vacation days for each period
    const codeCompleteVacations = this.getVacationDaysForPeriod(executeCommitDate, softCodeCompleteDate, executeCommitDate, gaDate);
    const afterCodeCompleteVacations = this.getVacationDaysForPeriod(softCodeCompleteDate, gaDate, executeCommitDate, gaDate);

    return {
      holidays: {
        total: codeCompleteHolidays.count + afterCodeCompleteHolidays.count,
        codeCompletePeriod: codeCompleteHolidays.count,
        afterCodeCompletePeriod: afterCodeCompleteHolidays.count,
        breakdown: [...codeCompleteHolidays.breakdown, ...afterCodeCompleteHolidays.breakdown]
      },
      hackathonDays: {
        total: codeCompleteHackathonDays.count + afterCodeCompleteHackathonDays.count,
        codeCompletePeriod: codeCompleteHackathonDays.count,
        afterCodeCompletePeriod: afterCodeCompleteHackathonDays.count,
        breakdown: [...codeCompleteHackathonDays.breakdown, ...afterCodeCompleteHackathonDays.breakdown]
      },
      vacations: {
        total: codeCompleteVacations + afterCodeCompleteVacations,
        codeCompletePeriod: codeCompleteVacations,
        afterCodeCompletePeriod: afterCodeCompleteVacations,
        policy: `${DEFAULTS.VACATION_POLICY.paidLeaveDays} paid leave days/year (${DEFAULTS.VACATION_POLICY.daysPerReleaseCycle} per NDB release cycle) + ${DEFAULTS.VACATION_POLICY.wellnessDays} wellness days + holidays`
      }
    };
  }

  /**
   * Get holidays for a specific period with detailed breakdown
   */
  private async getHolidaysForPeriod(startDate: Date, endDate: Date) {
    const year = startDate.getFullYear();
    const holidays = await holidayService.getHolidays(year, 'US');
    
    const relevantHolidays = holidays.filter(holiday => 
      holiday.date >= startDate && holiday.date <= endDate
    );
    
    return {
      count: relevantHolidays.length,
      breakdown: relevantHolidays.map(holiday => ({
        name: holiday.name,
        date: holiday.date,
        type: holiday.type
      }))
    };
  }

  /**
   * Get hackathon days for a specific period
   */
  private getHackathonDaysForPeriod(startDate: Date, endDate: Date) {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    let hackathonDays = [];
    
    // Check each year in the range
    for (let year = startYear; year <= endYear; year++) {
      const hackathonDates = this.getHackathonDatesForYear(year);
      
      hackathonDates.forEach(date => {
        if (date >= startDate && date <= endDate) {
          hackathonDays.push({
            date,
            reason: `Hackathon Day (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          });
        }
      });
    }
    
    return {
      count: hackathonDays.length,
      breakdown: hackathonDays
    };
  }

  /**
   * Get hackathon dates for a specific year
   */
  private getHackathonDatesForYear(year: number): Date[] {
    const firstDayOfFeb = new Date(year, 1, 1); // February
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
  }

  /**
   * Get vacation days for a specific period
   */
  private getVacationDaysForPeriod(startDate: Date, endDate: Date, totalStart: Date, totalEnd: Date): number {
    const totalDays = Math.ceil((totalEnd.getTime() - totalStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate vacation days proportionally
    const vacationDays = Math.round((periodDays / totalDays) * DEFAULTS.VACATION_POLICY.paidLeaveDays);
    
    return Math.max(0, Math.min(vacationDays, DEFAULTS.VACATION_POLICY.paidLeaveDays));
  }

  /**
   * Calculate final availability after deductions
   */
  private calculateAvailability(
    codeCompleteWorkingDays: number,
    afterCodeCompleteWorkingDays: number,
    deductions: any
  ) {
    const daysAvailableToCodeComplete = codeCompleteWorkingDays - 
      deductions.holidays.codeCompletePeriod - 
      deductions.hackathonDays.codeCompletePeriod - 
      deductions.vacations.codeCompletePeriod;
    
    const daysAvailableAfterCodeComplete = afterCodeCompleteWorkingDays - 
      deductions.holidays.afterCodeCompletePeriod - 
      deductions.hackathonDays.afterCodeCompletePeriod - 
      deductions.vacations.afterCodeCompletePeriod;
    
    const totalAvailableDays = daysAvailableToCodeComplete + daysAvailableAfterCodeComplete;
    const totalWorkingDays = codeCompleteWorkingDays + afterCodeCompleteWorkingDays;
    const totalDeductions = deductions.holidays.total + deductions.hackathonDays.total + deductions.vacations.total;
    
    const efficiency = totalWorkingDays > 0 ? ((totalAvailableDays / totalWorkingDays) * 100) : 0;

    return {
      daysAvailableToCodeComplete,
      daysAvailableAfterCodeComplete,
      totalAvailableDays,
      efficiency
    };
  }

  /**
   * Generate AI insights based on the analysis
   */
  private generateInsights(
    executeCommitDate: Date,
    softCodeCompleteDate: Date,
    gaDate: Date,
    deductions: any,
    availability: any
  ): string[] {
    const insights: string[] = [];
    
    // Project duration insights
    const totalDays = Math.ceil((gaDate.getTime() - executeCommitDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = totalDays / 30;
    
    if (months > 6) {
      insights.push(`📅 Long project duration: ${months.toFixed(1)} months from Execute Commit to GA`);
    } else if (months < 3) {
      insights.push(`⚡ Short project duration: ${months.toFixed(1)} months from Execute Commit to GA`);
    }
    
    // Efficiency insights
    if (availability.efficiency > 80) {
      insights.push(`✅ High efficiency: ${availability.efficiency.toFixed(1)}% of working days available`);
    } else if (availability.efficiency < 60) {
      insights.push(`⚠️ Low efficiency: Only ${availability.efficiency.toFixed(1)}% of working days available`);
    }
    
    // Holiday impact insights
    if (deductions.holidays.total > 10) {
      insights.push(`🎉 High holiday impact: ${deductions.holidays.total} holidays during project period`);
    }
    
    // Hackathon impact insights
    if (deductions.hackathonDays.total > 0) {
      insights.push(`💻 Hackathon impact: ${deductions.hackathonDays.total} hackathon days during project period`);
    }
    
    // Vacation impact insights
    if (deductions.vacations.total > 5) {
      insights.push(`🏖️ Vacation impact: ${deductions.vacations.total} vacation days during project period`);
    }
    
    return insights;
  }

  /**
   * Generate AI recommendations based on the analysis
   */
  private generateRecommendations(
    executeCommitDate: Date,
    softCodeCompleteDate: Date,
    gaDate: Date,
    deductions: any,
    availability: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Efficiency recommendations
    if (availability.efficiency < 70) {
      recommendations.push("Consider extending project timeline to account for high deduction impact");
      recommendations.push("Review holiday and vacation schedules to optimize working days");
    }
    
    // Holiday recommendations
    if (deductions.holidays.total > 8) {
      recommendations.push("Plan around major holidays to minimize impact on critical milestones");
    }
    
    // Hackathon recommendations
    if (deductions.hackathonDays.total > 0) {
      recommendations.push("Account for hackathon days in sprint planning and milestone scheduling");
    }
    
    // Vacation recommendations
    if (deductions.vacations.total > 4) {
      recommendations.push("Coordinate team vacation schedules to maintain consistent coverage");
    }
    
    // Timeline recommendations
    const codeCompleteDays = Math.ceil((softCodeCompleteDate.getTime() - executeCommitDate.getTime()) / (1000 * 60 * 60 * 24));
    if (codeCompleteDays < 30) {
      recommendations.push("Consider extending Code Complete timeline for better quality assurance");
    }
    
    return recommendations;
  }

  /**
   * Validate input dates
   */
  private validateDates(executeCommitDate: Date, softCodeCompleteDate: Date, gaDate: Date): void {
    if (executeCommitDate >= softCodeCompleteDate) {
      throw new Error("Execute Commit Date must be before Soft Code Complete Date");
    }
    
    if (softCodeCompleteDate >= gaDate) {
      throw new Error("Soft Code Complete Date must be before GA Date");
    }
    
    if (executeCommitDate >= gaDate) {
      throw new Error("Execute Commit Date must be before GA Date");
    }
  }
}

// Export singleton instance
export const availabilityAgent = AvailabilityAgent.getInstance();
