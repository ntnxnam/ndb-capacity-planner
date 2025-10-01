/**
 * MCP Client for NDB Capacity Planner
 * Provides a clean interface to communicate with the MCP server
 */

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    data?: string;
  }>;
  isError?: boolean;
}

export interface AvailabilityAnalysisResult {
  executeCommitDate: string;
  softCodeCompleteDate: string;
  gaDate: string;
  totalWorkingDays: number;
  codeCompleteWorkingDays: number;
  afterCodeCompleteWorkingDays: number;
  deductions: {
    holidays: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
    };
    hackathonDays: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
    };
    vacations: {
      total: number;
      codeCompletePeriod: number;
      afterCodeCompletePeriod: number;
    };
  };
  availability: {
    daysAvailableToCodeComplete: number;
    daysAvailableAfterCodeComplete: number;
    totalAvailableDays: number;
    efficiency: number;
  };
  insights: string[];
  recommendations: string[];
}

export class MCPClient {
  private static instance: MCPClient;
  private serverUrl: string;

  private constructor() {
    // In production, this would be configurable
    this.serverUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001/mcp';
  }

  public static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient();
    }
    return MCPClient.instance;
  }

  /**
   * Call a tool on the MCP server
   */
  private async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.serverUrl}/call-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toolCall),
      });

      if (!response.ok) {
        throw new Error(`MCP Server error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MCP Client error:', error);
      throw new Error(`Failed to call MCP tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze availability using the AI agent
   */
  async analyzeAvailability(
    executeCommitDate: string,
    softCodeCompleteDate: string,
    gaDate: string
  ): Promise<AvailabilityAnalysisResult> {
    const result = await this.callTool({
      name: 'analyze_availability',
      arguments: {
        executeCommitDate,
        softCodeCompleteDate,
        gaDate,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error in availability analysis');
    }

    // Parse the formatted text response back to structured data
    return this.parseAvailabilityAnalysis(result.content[0]?.text || '');
  }

  /**
   * Get holidays for a date range
   */
  async getHolidays(
    startDate: string,
    endDate: string,
    region: string = 'US'
  ): Promise<{ holidays: Array<{ name: string; date: string; type: string }>; count: number }> {
    const result = await this.callTool({
      name: 'get_holidays',
      arguments: {
        startDate,
        endDate,
        region,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error getting holidays');
    }

    return this.parseHolidays(result.content[0]?.text || '');
  }

  /**
   * Get hackathon days for a date range
   */
  async getHackathonDays(
    startDate: string,
    endDate: string
  ): Promise<{ hackathonDays: Array<{ date: string; reason: string }>; count: number }> {
    const result = await this.callTool({
      name: 'get_hackathon_days',
      arguments: {
        startDate,
        endDate,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error getting hackathon days');
    }

    return this.parseHackathonDays(result.content[0]?.text || '');
  }

  /**
   * Calculate vacation days for a period
   */
  async calculateVacationDays(
    startDate: string,
    endDate: string,
    totalStartDate: string,
    totalEndDate: string
  ): Promise<{ vacationDays: number; policy: string }> {
    const result = await this.callTool({
      name: 'calculate_vacation_days',
      arguments: {
        startDate,
        endDate,
        totalStartDate,
        totalEndDate,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error calculating vacation days');
    }

    return this.parseVacationDays(result.content[0]?.text || '');
  }

  /**
   * Get default configuration values
   */
  async getDefaults(category: string = 'all'): Promise<any> {
    const result = await this.callTool({
      name: 'get_defaults',
      arguments: {
        category,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error getting defaults');
    }

    return this.parseDefaults(result.content[0]?.text || '');
  }

  /**
   * Validate date gaps
   */
  async validateDateGaps(
    dates: Record<string, string>,
    dateGaps: Record<string, number>
  ): Promise<{ warnings: string[]; errors: string[] }> {
    const result = await this.callTool({
      name: 'validate_date_gaps',
      arguments: {
        dates,
        dateGaps,
      },
    });

    if (result.isError) {
      throw new Error(result.content[0]?.text || 'Unknown error validating date gaps');
    }

    return this.parseDateGapValidation(result.content[0]?.text || '');
  }

  // Parser methods for converting formatted text back to structured data
  private parseAvailabilityAnalysis(text: string): AvailabilityAnalysisResult {
    // This is a simplified parser - in production, you'd want more robust parsing
    // For now, we'll return a mock structure since the MCP server returns formatted text
    // In a real implementation, the MCP server would return structured JSON
    
    // Extract key values using regex patterns
    const totalWorkingDaysMatch = text.match(/Total Working Days\*\*: (\d+)/);
    const codeCompleteWorkingDaysMatch = text.match(/Code Complete Period\*\*: (\d+) days/);
    const afterCodeCompleteWorkingDaysMatch = text.match(/After Code Complete Period\*\*: (\d+) days/);
    
    const holidaysTotalMatch = text.match(/Holidays: (\d+) days/);
    const hackathonTotalMatch = text.match(/Hackathon Days: (\d+) days/);
    const vacationsTotalMatch = text.match(/Vacations: (\d+) days/);
    
    const daysAvailableToCodeCompleteMatch = text.match(/Days Available to Code Complete\*\*: (\d+)/);
    const daysAvailableAfterCodeCompleteMatch = text.match(/Days Available After Code Complete\*\*: (\d+)/);
    const totalAvailableDaysMatch = text.match(/Total Available Days\*\*: (\d+)/);
    const efficiencyMatch = text.match(/Efficiency\*\*: ([\d.]+)%/);

    return {
      executeCommitDate: '',
      softCodeCompleteDate: '',
      gaDate: '',
      totalWorkingDays: parseInt(totalWorkingDaysMatch?.[1] || '0'),
      codeCompleteWorkingDays: parseInt(codeCompleteWorkingDaysMatch?.[1] || '0'),
      afterCodeCompleteWorkingDays: parseInt(afterCodeCompleteWorkingDaysMatch?.[1] || '0'),
      deductions: {
        holidays: {
          total: parseInt(holidaysTotalMatch?.[1] || '0'),
          codeCompletePeriod: 0,
          afterCodeCompletePeriod: 0,
        },
        hackathonDays: {
          total: parseInt(hackathonTotalMatch?.[1] || '0'),
          codeCompletePeriod: 0,
          afterCodeCompletePeriod: 0,
        },
        vacations: {
          total: parseInt(vacationsTotalMatch?.[1] || '0'),
          codeCompletePeriod: 0,
          afterCodeCompletePeriod: 0,
        },
      },
      availability: {
        daysAvailableToCodeComplete: parseInt(daysAvailableToCodeCompleteMatch?.[1] || '0'),
        daysAvailableAfterCodeComplete: parseInt(daysAvailableAfterCodeCompleteMatch?.[1] || '0'),
        totalAvailableDays: parseInt(totalAvailableDaysMatch?.[1] || '0'),
        efficiency: parseFloat(efficiencyMatch?.[1] || '0'),
      },
      insights: [],
      recommendations: [],
    };
  }

  private parseHolidays(text: string): { holidays: Array<{ name: string; date: string; type: string }>; count: number } {
    // Parse holiday data from formatted text
    const countMatch = text.match(/\*\*Total Holidays\*\*: (\d+)/);
    const count = parseInt(countMatch?.[1] || '0');
    
    // In a real implementation, you'd parse the individual holidays
    return {
      holidays: [],
      count,
    };
  }

  private parseHackathonDays(text: string): { hackathonDays: Array<{ date: string; reason: string }>; count: number } {
    const countMatch = text.match(/\*\*Total Hackathon Days\*\*: (\d+)/);
    const count = parseInt(countMatch?.[1] || '0');
    
    return {
      hackathonDays: [],
      count,
    };
  }

  private parseVacationDays(text: string): { vacationDays: number; policy: string } {
    const vacationDaysMatch = text.match(/\*\*Vacation Days\*\*: (\d+)/);
    const policyMatch = text.match(/\*\*Policy\*\*: (.+)/);
    
    return {
      vacationDays: parseInt(vacationDaysMatch?.[1] || '0'),
      policy: policyMatch?.[1] || '',
    };
  }

  private parseDefaults(text: string): any {
    // Extract JSON from the formatted text
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        console.error('Error parsing defaults JSON:', error);
        return {};
      }
    }
    return {};
  }

  private parseDateGapValidation(text: string): { warnings: string[]; errors: string[] } {
    // Parse warnings and errors from formatted text
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // This is a simplified parser - in production, you'd want more robust parsing
    const warningMatches = text.match(/- ⚠️ (.+)/g);
    const errorMatches = text.match(/- ❌ (.+)/g);
    
    if (warningMatches) {
      warnings.push(...warningMatches.map(match => match.replace('- ⚠️ ', '')));
    }
    
    if (errorMatches) {
      errors.push(...errorMatches.map(match => match.replace('- ❌ ', '')));
    }
    
    return { warnings, errors };
  }
}

// Export singleton instance
export const mcpClient = MCPClient.getInstance();
