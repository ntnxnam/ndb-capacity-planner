/**
 * MCP Server Route Handler
 * Provides HTTP endpoints for MCP server functionality
 */

import { Router, Request, Response } from 'express';
import { NDBCapacityPlannerMCPServer } from '../mcp/server';

const router = Router();

// Create MCP server instance
const mcpServer = new NDBCapacityPlannerMCPServer();

/**
 * List available tools
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    // Simulate the MCP server's list tools functionality
    const tools = [
      {
        name: 'analyze_availability',
        description: 'Analyze project availability using AI agent based on actual dates',
        inputSchema: {
          type: 'object',
          properties: {
            executeCommitDate: {
              type: 'string',
              format: 'date',
              description: 'Execute Commit Date (ISO 8601 format)'
            },
            softCodeCompleteDate: {
              type: 'string',
              format: 'date',
              description: 'Soft Code Complete Date (ISO 8601 format)'
            },
            gaDate: {
              type: 'string',
              format: 'date',
              description: 'GA Date (ISO 8601 format)'
            }
          },
          required: ['executeCommitDate', 'softCodeCompleteDate', 'gaDate']
        }
      },
      {
        name: 'get_holidays',
        description: 'Get holidays for a specific date range',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Start date (ISO 8601 format)'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date (ISO 8601 format)'
            },
            region: {
              type: 'string',
              description: 'Region for holiday calculation (default: US)',
              default: 'US'
            }
          },
          required: ['startDate', 'endDate']
        }
      },
      {
        name: 'get_hackathon_days',
        description: 'Get hackathon days for a specific date range',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Start date (ISO 8601 format)'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date (ISO 8601 format)'
            }
          },
          required: ['startDate', 'endDate']
        }
      },
      {
        name: 'calculate_vacation_days',
        description: 'Calculate vacation days for a specific period',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Start date (ISO 8601 format)'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'End date (ISO 8601 format)'
            },
            totalStartDate: {
              type: 'string',
              format: 'date',
              description: 'Total project start date (ISO 8601 format)'
            },
            totalEndDate: {
              type: 'string',
              format: 'date',
              description: 'Total project end date (ISO 8601 format)'
            }
          },
          required: ['startDate', 'endDate', 'totalStartDate', 'totalEndDate']
        }
      },
      {
        name: 'get_defaults',
        description: 'Get default configuration values',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Configuration category (vacation_policy, date_gaps, hackathon_config, etc.)',
              enum: ['vacation_policy', 'date_gaps', 'hackathon_config', 'ndb_release_config', 'all']
            }
          }
        }
      },
      {
        name: 'validate_date_gaps',
        description: 'Validate if dates align with configured date gaps',
        inputSchema: {
          type: 'object',
          properties: {
            dates: {
              type: 'object',
              properties: {
                gaDate: { type: 'string', format: 'date' },
                promotionGateDate: { type: 'string', format: 'date' },
                commitGateDate: { type: 'string', format: 'date' },
                softCodeCompleteDate: { type: 'string', format: 'date' },
                executeCommitDate: { type: 'string', format: 'date' },
                conceptCommitDate: { type: 'string', format: 'date' },
                preCcCompleteDate: { type: 'string', format: 'date' }
              }
            },
            dateGaps: {
              type: 'object',
              properties: {
                gaToPromotionGate: { type: 'number' },
                promotionGateToCommitGate: { type: 'number' },
                commitGateToSoftCodeComplete: { type: 'number' },
                softCodeCompleteToExecuteCommit: { type: 'number' },
                executeCommitToConceptCommit: { type: 'number' },
                conceptCommitToPreCC: { type: 'number' }
              }
            }
          },
          required: ['dates', 'dateGaps']
        }
      }
    ];

    res.json({ tools });
  } catch (error) {
    console.error('Error listing MCP tools:', error);
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

/**
 * Call a tool
 */
router.post('/call-tool', async (req: Request, res: Response) => {
  try {
    const { name, arguments: args } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }

    // Handle tool calls directly (simplified version)
    let result;
    
    switch (name) {
      case 'analyze_availability':
        result = await handleAnalyzeAvailability(args);
        break;
      
      case 'get_holidays':
        result = await handleGetHolidays(args);
        break;
      
      case 'get_hackathon_days':
        result = await handleGetHackathonDays(args);
        break;
      
      case 'calculate_vacation_days':
        result = await handleCalculateVacationDays(args);
        break;
      
      case 'get_defaults':
        result = await handleGetDefaults(args);
        break;
      
      case 'validate_date_gaps':
        result = await handleValidateDateGaps(args);
        break;
      
      default:
        return res.status(400).json({ error: `Unknown tool: ${name}` });
    }

    res.json(result);
  } catch (error) {
    console.error('Error calling MCP tool:', error);
    res.status(500).json({ 
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }
      ],
      isError: true
    });
  }
});

// Tool handlers
async function handleAnalyzeAvailability(args: any) {
  const { executeCommitDate, softCodeCompleteDate, gaDate } = args;
  
  // Import the availability agent
  const { availabilityAgent } = await import('../../frontend/src/lib/availabilityAgent');
  
  const analysis = await availabilityAgent.analyzeAvailability(
    new Date(executeCommitDate),
    new Date(softCodeCompleteDate),
    new Date(gaDate)
  );

  return {
    content: [
      {
        type: 'text',
        text: formatAvailabilityAnalysis(analysis)
      }
    ]
  };
}

async function handleGetHolidays(args: any) {
  const { startDate, endDate, region = 'US' } = args;
  
  const { holidayService } = await import('../../frontend/src/lib/holidayService');
  
  const holidays = await holidayService.getHolidays(
    new Date(startDate).getFullYear(),
    region
  );
  
  const relevantHolidays = holidays.filter(holiday => 
    holiday.date >= new Date(startDate) && holiday.date <= new Date(endDate)
  );

  return {
    content: [
      {
        type: 'text',
        text: formatHolidays(relevantHolidays, startDate, endDate)
      }
    ]
  };
}

async function handleGetHackathonDays(args: any) {
  const { startDate, endDate } = args;
  
  const hackathonDays = calculateHackathonDaysForPeriod(
    new Date(startDate),
    new Date(endDate)
  );

  return {
    content: [
      {
        type: 'text',
        text: formatHackathonDays(hackathonDays, startDate, endDate)
      }
    ]
  };
}

async function handleCalculateVacationDays(args: any) {
  const { startDate, endDate, totalStartDate, totalEndDate } = args;
  
  const { DEFAULTS } = await import('../../frontend/src/lib/defaults');
  
  const vacationDays = calculateVacationDaysForPeriod(
    new Date(startDate),
    new Date(endDate),
    new Date(totalStartDate),
    new Date(totalEndDate),
    DEFAULTS.VACATION_POLICY
  );

  return {
    content: [
      {
        type: 'text',
        text: formatVacationDays(vacationDays, startDate, endDate, DEFAULTS.VACATION_POLICY)
      }
    ]
  };
}

async function handleGetDefaults(args: any) {
  const { category = 'all' } = args;
  
  const { DEFAULTS } = await import('../../frontend/src/lib/defaults');
  
  let defaults;
  switch (category) {
    case 'vacation_policy':
      defaults = DEFAULTS.VACATION_POLICY;
      break;
    case 'date_gaps':
      defaults = DEFAULTS.DATE_GAPS;
      break;
    case 'hackathon_config':
      defaults = DEFAULTS.HACKATHON_CONFIG;
      break;
    case 'ndb_release_config':
      defaults = DEFAULTS.NDB_RELEASE_CONFIG;
      break;
    case 'all':
    default:
      defaults = DEFAULTS;
      break;
  }

  return {
    content: [
      {
        type: 'text',
        text: formatDefaults(defaults, category)
      }
    ]
  };
}

async function handleValidateDateGaps(args: any) {
  const { dates, dateGaps } = args;
  
  const validation = validateDateGaps(dates, dateGaps);

  return {
    content: [
      {
        type: 'text',
        text: formatDateGapValidation(validation)
      }
    ]
  };
}

// Helper functions
function calculateHackathonDaysForPeriod(startDate: Date, endDate: Date): Array<{ date: Date; reason: string }> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  let hackathonDays = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const hackathonDates = getHackathonDatesForYear(year);
    
    hackathonDates.forEach(date => {
      if (date >= startDate && date <= endDate) {
        hackathonDays.push({
          date,
          reason: `Hackathon Day (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
        });
      }
    });
  }
  
  return hackathonDays;
}

function getHackathonDatesForYear(year: number): Date[] {
  const firstDayOfFeb = new Date(year, 1, 1); // February
  let currentDay = new Date(firstDayOfFeb);

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

function calculateVacationDaysForPeriod(
  startDate: Date, 
  endDate: Date, 
  totalStart: Date, 
  totalEnd: Date,
  vacationPolicy: any
): number {
  const totalDays = Math.ceil((totalEnd.getTime() - totalStart.getTime()) / (1000 * 60 * 60 * 24));
  const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const vacationDays = Math.round((periodDays / totalDays) * vacationPolicy.paidLeaveDays);
  
  return Math.max(0, Math.min(vacationDays, vacationPolicy.paidLeaveDays));
}

function validateDateGaps(dates: any, dateGaps: any): { warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  const getWeeksBetween = (date1: Date, date2: Date): number => {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.round(diffDays / 7);
  };

  // Validate each gap
  if (dates.gaDate && dates.promotionGateDate) {
    const actualWeeks = getWeeksBetween(new Date(dates.gaDate), new Date(dates.promotionGateDate));
    const expectedWeeks = dateGaps.gaToPromotionGate;
    if (actualWeeks !== expectedWeeks) {
      warnings.push(`GA to Promotion Gate: Expected ${expectedWeeks} weeks, got ${actualWeeks} weeks`);
    }
  }

  return { warnings, errors };
}

// Formatting functions
function formatAvailabilityAnalysis(analysis: any): string {
  return `# 🤖 AI Availability Analysis

## 📅 Project Timeline
- **Execute Commit Date**: ${analysis.executeCommitDate.toLocaleDateString()}
- **Soft Code Complete Date**: ${analysis.softCodeCompleteDate.toLocaleDateString()}
- **GA Date**: ${analysis.gaDate.toLocaleDateString()}

## 📊 Working Days
- **Total Working Days**: ${analysis.totalWorkingDays}
- **Code Complete Period**: ${analysis.codeCompleteWorkingDays} days
- **After Code Complete Period**: ${analysis.afterCodeCompleteWorkingDays} days

## 🎯 Deductions
### Holidays: ${analysis.deductions.holidays.total} days
- Code Complete Period: ${analysis.deductions.holidays.codeCompletePeriod} days
- After Code Complete Period: ${analysis.deductions.holidays.afterCodeCompletePeriod} days

### Hackathon Days: ${analysis.deductions.hackathonDays.total} days
- Code Complete Period: ${analysis.deductions.hackathonDays.codeCompletePeriod} days
- After Code Complete Period: ${analysis.deductions.hackathonDays.afterCodeCompletePeriod} days

### Vacations: ${analysis.deductions.vacations.total} days
- Code Complete Period: ${analysis.deductions.vacations.codeCompletePeriod} days
- After Code Complete Period: ${analysis.deductions.vacations.afterCodeCompletePeriod} days

## ✅ Final Availability
- **Days Available to Code Complete**: ${analysis.availability.daysAvailableToCodeComplete}
- **Days Available After Code Complete**: ${analysis.availability.daysAvailableAfterCodeComplete}
- **Total Available Days**: ${analysis.availability.totalAvailableDays}
- **Efficiency**: ${analysis.availability.efficiency.toFixed(1)}%

## 💡 AI Insights
${analysis.insights.map((insight: string) => `- ${insight}`).join('\n')}

## 🎯 Recommendations
${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}`;
}

function formatHolidays(holidays: any[], startDate: string, endDate: string): string {
  return `# 🎉 Holidays Analysis

**Period**: ${startDate} to ${endDate}
**Total Holidays**: ${holidays.length}

## Holiday Breakdown
${holidays.map(holiday => 
  `- **${holiday.name}** (${holiday.date.toLocaleDateString()}) - ${holiday.type}`
).join('\n')}`;
}

function formatHackathonDays(hackathonDays: Array<{ date: Date; reason: string }>, startDate: string, endDate: string): string {
  return `# 💻 Hackathon Days Analysis

**Period**: ${startDate} to ${endDate}
**Total Hackathon Days**: ${hackathonDays.length}

## Hackathon Days
${hackathonDays.map(day => 
  `- **${day.reason}** (${day.date.toLocaleDateString()})`
).join('\n')}`;
}

function formatVacationDays(vacationDays: number, startDate: string, endDate: string, vacationPolicy: any): string {
  return `# 🏖️ Vacation Days Analysis

**Period**: ${startDate} to ${endDate}
**Vacation Days**: ${vacationDays}

**Policy**: ${vacationPolicy.paidLeaveDays} paid leave days/year (${vacationPolicy.daysPerReleaseCycle} per NDB release cycle) + ${vacationPolicy.wellnessDays} wellness days + holidays`;
}

function formatDefaults(defaults: any, category: string): string {
  return `# ⚙️ Default Configuration

**Category**: ${category}

\`\`\`json
${JSON.stringify(defaults, null, 2)}
\`\`\``;
}

function formatDateGapValidation(validation: { warnings: string[]; errors: string[] }): string {
  return `# 📏 Date Gap Validation

## Warnings (${validation.warnings.length})
${validation.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}

## Errors (${validation.errors.length})
${validation.errors.map(error => `- ❌ ${error}`).join('\n')}

${validation.warnings.length === 0 && validation.errors.length === 0 ? '✅ All date gaps are valid!' : ''}`;
}

export default router;
