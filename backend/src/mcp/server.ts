/**
 * MCP Server for NDB Capacity Planner
 * Exposes AI Availability Agent and calculation services via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
  ImageContent,
} from '@modelcontextprotocol/sdk/types.js';
import { availabilityAgent, AvailabilityAnalysis } from '../../frontend/src/lib/availabilityAgent';
import { holidayService } from '../../frontend/src/lib/holidayService';
import { DEFAULTS } from '../../frontend/src/lib/defaults';

// MCP Server Configuration
const SERVER_NAME = 'ndb-capacity-planner-mcp';
const SERVER_VERSION = '1.0.0';

// Available Tools
const TOOLS: Tool[] = [
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

export class NDBCapacityPlannerMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_availability':
            return await this.handleAnalyzeAvailability(args);
          
          case 'get_holidays':
            return await this.handleGetHolidays(args);
          
          case 'get_hackathon_days':
            return await this.handleGetHackathonDays(args);
          
          case 'calculate_vacation_days':
            return await this.handleCalculateVacationDays(args);
          
          case 'get_defaults':
            return await this.handleGetDefaults(args);
          
          case 'validate_date_gaps':
            return await this.handleValidateDateGaps(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleAnalyzeAvailability(args: any): Promise<CallToolResult> {
    const { executeCommitDate, softCodeCompleteDate, gaDate } = args;
    
    const analysis = await availabilityAgent.analyzeAvailability(
      new Date(executeCommitDate),
      new Date(softCodeCompleteDate),
      new Date(gaDate)
    );

    return {
      content: [
        {
          type: 'text',
          text: this.formatAvailabilityAnalysis(analysis)
        }
      ]
    };
  }

  private async handleGetHolidays(args: any): Promise<CallToolResult> {
    const { startDate, endDate, region = 'US' } = args;
    
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
          text: this.formatHolidays(relevantHolidays, startDate, endDate)
        }
      ]
    };
  }

  private async handleGetHackathonDays(args: any): Promise<CallToolResult> {
    const { startDate, endDate } = args;
    
    const hackathonDays = this.calculateHackathonDaysForPeriod(
      new Date(startDate),
      new Date(endDate)
    );

    return {
      content: [
        {
          type: 'text',
          text: this.formatHackathonDays(hackathonDays, startDate, endDate)
        }
      ]
    };
  }

  private async handleCalculateVacationDays(args: any): Promise<CallToolResult> {
    const { startDate, endDate, totalStartDate, totalEndDate } = args;
    
    const vacationDays = this.calculateVacationDaysForPeriod(
      new Date(startDate),
      new Date(endDate),
      new Date(totalStartDate),
      new Date(totalEndDate)
    );

    return {
      content: [
        {
          type: 'text',
          text: this.formatVacationDays(vacationDays, startDate, endDate)
        }
      ]
    };
  }

  private async handleGetDefaults(args: any): Promise<CallToolResult> {
    const { category = 'all' } = args;
    
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
          text: this.formatDefaults(defaults, category)
        }
      ]
    };
  }

  private async handleValidateDateGaps(args: any): Promise<CallToolResult> {
    const { dates, dateGaps } = args;
    
    const validation = this.validateDateGaps(dates, dateGaps);

    return {
      content: [
        {
          type: 'text',
          text: this.formatDateGapValidation(validation)
        }
      ]
    };
  }

  // Helper methods for calculations
  private calculateHackathonDaysForPeriod(startDate: Date, endDate: Date): Array<{ date: Date; reason: string }> {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    let hackathonDays = [];
    
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
    
    return hackathonDays;
  }

  private getHackathonDatesForYear(year: number): Date[] {
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

  private calculateVacationDaysForPeriod(
    startDate: Date, 
    endDate: Date, 
    totalStart: Date, 
    totalEnd: Date
  ): number {
    const totalDays = Math.ceil((totalEnd.getTime() - totalStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const vacationDays = Math.round((periodDays / totalDays) * DEFAULTS.VACATION_POLICY.paidLeaveDays);
    
    return Math.max(0, Math.min(vacationDays, DEFAULTS.VACATION_POLICY.paidLeaveDays));
  }

  private validateDateGaps(dates: any, dateGaps: any): { warnings: string[]; errors: string[] } {
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

    // Add more validations as needed...

    return { warnings, errors };
  }

  // Formatting methods
  private formatAvailabilityAnalysis(analysis: AvailabilityAnalysis): string {
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
${analysis.insights.map(insight => `- ${insight}`).join('\n')}

## 🎯 Recommendations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}`;
  }

  private formatHolidays(holidays: any[], startDate: string, endDate: string): string {
    return `# 🎉 Holidays Analysis

**Period**: ${startDate} to ${endDate}
**Total Holidays**: ${holidays.length}

## Holiday Breakdown
${holidays.map(holiday => 
  `- **${holiday.name}** (${holiday.date.toLocaleDateString()}) - ${holiday.type}`
).join('\n')}`;
  }

  private formatHackathonDays(hackathonDays: Array<{ date: Date; reason: string }>, startDate: string, endDate: string): string {
    return `# 💻 Hackathon Days Analysis

**Period**: ${startDate} to ${endDate}
**Total Hackathon Days**: ${hackathonDays.length}

## Hackathon Days
${hackathonDays.map(day => 
  `- **${day.reason}** (${day.date.toLocaleDateString()})`
).join('\n')}`;
  }

  private formatVacationDays(vacationDays: number, startDate: string, endDate: string): string {
    return `# 🏖️ Vacation Days Analysis

**Period**: ${startDate} to ${endDate}
**Vacation Days**: ${vacationDays}

**Policy**: ${DEFAULTS.VACATION_POLICY.paidLeaveDays} paid leave days/year (${DEFAULTS.VACATION_POLICY.daysPerReleaseCycle} per NDB release cycle) + ${DEFAULTS.VACATION_POLICY.wellnessDays} wellness days + holidays`;
  }

  private formatDefaults(defaults: any, category: string): string {
    return `# ⚙️ Default Configuration

**Category**: ${category}

\`\`\`json
${JSON.stringify(defaults, null, 2)}
\`\`\``;
  }

  private formatDateGapValidation(validation: { warnings: string[]; errors: string[] }): string {
    return `# 📏 Date Gap Validation

## Warnings (${validation.warnings.length})
${validation.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')}

## Errors (${validation.errors.length})
${validation.errors.map(error => `- ❌ ${error}`).join('\n')}

${validation.warnings.length === 0 && validation.errors.length === 0 ? '✅ All date gaps are valid!' : ''}`;
  }

  // Start the server
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(`🚀 ${SERVER_NAME} v${SERVER_VERSION} MCP Server started`);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new NDBCapacityPlannerMCPServer();
  server.start().catch(console.error);
}

export default NDBCapacityPlannerMCPServer;
