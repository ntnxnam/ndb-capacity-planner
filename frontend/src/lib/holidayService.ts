// Holiday calculation service
// This service provides AI-powered holiday calculations for different regions and years

export interface HolidayInfo {
  name: string;
  date: Date;
  type: 'federal' | 'regional' | 'company';
}

export class HolidayService {
  private static instance: HolidayService;
  
  private constructor() {}
  
  public static getInstance(): HolidayService {
    if (!HolidayService.instance) {
      HolidayService.instance = new HolidayService();
    }
    return HolidayService.instance;
  }

  /**
   * Get holidays for a given year and region
   * Comprehensive holiday calculation including US federal holidays, 
   * Indian festivals, and year-end slowdown periods
   */
  public async getHolidays(year: number, region: string = 'US'): Promise<HolidayInfo[]> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const holidays: HolidayInfo[] = [];
    
    // US Federal Holidays
    if (region === 'US') {
      holidays.push(
        { name: "New Year's Day", date: new Date(year, 0, 1), type: 'federal' },
        { name: "Martin Luther King Jr. Day", date: this.getMLKDay(year), type: 'federal' },
        { name: "Presidents' Day", date: this.getPresidentsDay(year), type: 'federal' },
        { name: "Memorial Day", date: this.getMemorialDay(year), type: 'federal' },
        { name: "Independence Day", date: new Date(year, 6, 4), type: 'federal' },
        { name: "Labor Day", date: this.getLaborDay(year), type: 'federal' },
        { name: "Columbus Day", date: this.getColumbusDay(year), type: 'federal' },
        { name: "Veterans Day", date: new Date(year, 10, 11), type: 'federal' },
        { name: "Thanksgiving Day", date: this.getThanksgiving(year), type: 'federal' },
        { name: "Christmas Day", date: new Date(year, 11, 25), type: 'federal' }
      );
    }
    
    // Indian Festivals and Holidays (for Nutanix India offices)
    holidays.push(
      { name: "Makar Sankranti/Pongal", date: this.getSankranti(year), type: 'regional' },
      { name: "Republic Day", date: new Date(year, 0, 26), type: 'regional' },
      { name: "Holi", date: this.getHoli(year), type: 'regional' },
      { name: "Good Friday", date: this.getGoodFriday(year), type: 'regional' },
      { name: "Eid al-Fitr", date: this.getEidFitr(year), type: 'regional' },
      { name: "Independence Day", date: new Date(year, 7, 15), type: 'regional' },
      { name: "Janmashtami", date: this.getJanmashtami(year), type: 'regional' },
      { name: "Ganesh Chaturthi", date: this.getGaneshChaturthi(year), type: 'regional' },
      { name: "Dussehra", date: this.getDussehra(year), type: 'regional' },
      { name: "Diwali", date: this.getDiwali(year), type: 'regional' },
      { name: "Bhai Dooj", date: this.getBhaiDooj(year), type: 'regional' },
      { name: "Guru Nanak Jayanti", date: this.getGuruNanakJayanti(year), type: 'regional' }
    );
    
    // Company wellness days (3 per year, evenly spread)
    holidays.push(
      { name: "Wellness Day - March", date: this.getWellnessDayMarch(year), type: 'company' },
      { name: "Wellness Day - June", date: this.getWellnessDayJune(year), type: 'company' },
      { name: "Wellness Day - September", date: this.getWellnessDaySeptember(year), type: 'company' }
    );
    
    // Year-end slowdown and company holidays
    holidays.push(
      { name: "Christmas Eve", date: new Date(year, 11, 24), type: 'company' },
      { name: "New Year's Eve", date: new Date(year, 11, 31), type: 'company' },
      { name: "Year-end Slowdown Start", date: new Date(year, 11, 20), type: 'company' },
      { name: "Year-end Slowdown End", date: new Date(year, 11, 31), type: 'company' }
    );
    
    // Add additional slowdown days around major holidays
    const diwali = this.getDiwali(year);
    holidays.push(
      { name: "Diwali Eve", date: new Date(diwali.getTime() - 24 * 60 * 60 * 1000), type: 'company' },
      { name: "Diwali Day 2", date: new Date(diwali.getTime() + 24 * 60 * 60 * 1000), type: 'company' }
    );
    
    const christmas = new Date(year, 11, 25);
    holidays.push(
      { name: "Christmas Eve", date: new Date(christmas.getTime() - 24 * 60 * 60 * 1000), type: 'company' },
      { name: "Boxing Day", date: new Date(christmas.getTime() + 24 * 60 * 60 * 1000), type: 'company' }
    );
    
    return holidays;
  }

  /**
   * Count holidays between two dates
   */
  public async countHolidaysInRange(startDate: Date, endDate: Date, region: string = 'US'): Promise<number> {
    const year = startDate.getFullYear();
    const holidays = await this.getHolidays(year, region);
    
    let count = 0;
    holidays.forEach(holiday => {
      if (holiday.date >= startDate && holiday.date <= endDate) {
        count++;
      }
    });
    
    return count;
  }

  /**
   * Get working days between two dates (excluding weekends and holidays)
   */
  public async getWorkingDays(startDate: Date, endDate: Date, region: string = 'US'): Promise<number> {
    const holidays = await this.countHolidaysInRange(startDate, endDate, region);
    
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
    
    return workingDays - holidays;
  }

  // Helper methods for calculating floating holidays
  private getMLKDay(year: number): Date {
    // Third Monday of January
    const jan = new Date(year, 0, 1);
    const firstMonday = jan.getDay() === 0 ? 1 : 8 - jan.getDay();
    return new Date(year, 0, firstMonday + 14);
  }

  private getPresidentsDay(year: number): Date {
    // Third Monday of February
    const feb = new Date(year, 1, 1);
    const firstMonday = feb.getDay() === 0 ? 1 : 8 - feb.getDay();
    return new Date(year, 1, firstMonday + 14);
  }

  private getMemorialDay(year: number): Date {
    // Last Monday of May
    const may = new Date(year, 4, 31);
    const lastMonday = may.getDay() === 0 ? 25 : may.getDate() - may.getDay() + 1;
    return new Date(year, 4, lastMonday);
  }

  private getLaborDay(year: number): Date {
    // First Monday of September
    const sep = new Date(year, 8, 1);
    const firstMonday = sep.getDay() === 0 ? 1 : 8 - sep.getDay();
    return new Date(year, 8, firstMonday);
  }

  private getColumbusDay(year: number): Date {
    // Second Monday of October
    const oct = new Date(year, 9, 1);
    const firstMonday = oct.getDay() === 0 ? 1 : 8 - oct.getDay();
    return new Date(year, 9, firstMonday + 7);
  }

  private getThanksgiving(year: number): Date {
    // Fourth Thursday of November
    const nov = new Date(year, 10, 1);
    const firstThursday = nov.getDay() === 0 ? 4 : (4 - nov.getDay() + 7) % 7 + 1;
    return new Date(year, 10, firstThursday + 21);
  }

  // Indian Festival Date Calculations
  private getSankranti(year: number): Date {
    // Makar Sankranti is typically January 14th
    return new Date(year, 0, 14);
  }

  private getHoli(year: number): Date {
    // Holi is typically in March, using approximate dates
    // In 2024: March 25, 2025: March 14, 2026: March 3
    const holiDates: { [key: number]: number } = {
      2024: 25, 2025: 14, 2026: 3, 2027: 22, 2028: 11, 2029: 1, 2030: 20
    };
    return new Date(year, 2, holiDates[year] || 14);
  }

  private getGoodFriday(year: number): Date {
    // Good Friday calculation (Friday before Easter)
    // Using simplified calculation - in production, use proper Easter calculation
    const easterDates: { [key: number]: number } = {
      2024: 31, 2025: 20, 2026: 5, 2027: 28, 2028: 16, 2029: 1, 2030: 21
    };
    const easterDay = easterDates[year] || 20;
    const easter = new Date(year, 2, easterDay); // March
    return new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days before Easter
  }

  private getEidFitr(year: number): Date {
    // Eid al-Fitr dates (approximate)
    const eidDates: { [key: number]: number } = {
      2024: 10, 2025: 30, 2026: 20, 2027: 9, 2028: 28, 2029: 17, 2030: 6
    };
    return new Date(year, 3, eidDates[year] || 10); // April
  }

  private getJanmashtami(year: number): Date {
    // Krishna Janmashtami dates (approximate)
    const janmashtamiDates: { [key: number]: number } = {
      2024: 26, 2025: 15, 2026: 4, 2027: 24, 2028: 12, 2029: 1, 2030: 20
    };
    return new Date(year, 7, janmashtamiDates[year] || 15); // August
  }

  private getGaneshChaturthi(year: number): Date {
    // Ganesh Chaturthi dates (approximate)
    const ganeshDates: { [key: number]: number } = {
      2024: 7, 2025: 26, 2026: 15, 2027: 4, 2028: 23, 2029: 12, 2030: 1
    };
    return new Date(year, 8, ganeshDates[year] || 7); // September
  }

  private getDussehra(year: number): Date {
    // Dussehra dates (approximate)
    const dussehraDates: { [key: number]: number } = {
      2024: 12, 2025: 2, 2026: 21, 2027: 10, 2028: 28, 2029: 17, 2030: 6
    };
    return new Date(year, 9, dussehraDates[year] || 12); // October
  }

  private getDiwali(year: number): Date {
    // Diwali dates (approximate)
    const diwaliDates: { [key: number]: number } = {
      2024: 1, 2025: 20, 2026: 8, 2027: 28, 2028: 17, 2029: 5, 2030: 25
    };
    return new Date(year, 10, diwaliDates[year] || 1); // November
  }

  private getBhaiDooj(year: number): Date {
    // Bhai Dooj is 2 days after Diwali
    const diwali = this.getDiwali(year);
    return new Date(diwali.getTime() + 2 * 24 * 60 * 60 * 1000);
  }

  private getGuruNanakJayanti(year: number): Date {
    // Guru Nanak Jayanti dates (approximate)
    const guruNanakDates: { [key: number]: number } = {
      2024: 15, 2025: 5, 2026: 24, 2027: 13, 2028: 2, 2029: 21, 2030: 10
    };
    return new Date(year, 10, guruNanakDates[year] || 15); // November
  }

  // Wellness Day Calculations (3 per year, evenly spread)
  private getWellnessDayMarch(year: number): Date {
    // Mid-March (around 15th)
    return new Date(year, 2, 15); // March 15th
  }

  private getWellnessDayJune(year: number): Date {
    // Mid-June (around 15th)
    return new Date(year, 5, 15); // June 15th
  }

  private getWellnessDaySeptember(year: number): Date {
    // Mid-September (around 15th)
    return new Date(year, 8, 15); // September 15th
  }
}

// Export singleton instance
export const holidayService = HolidayService.getInstance();
