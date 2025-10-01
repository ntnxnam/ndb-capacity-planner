import { DatabaseManager } from '../database/DatabaseManager';

export class HackathonService {
  private static instance: HackathonService;
  private db: DatabaseManager;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public static getInstance(): HackathonService {
    if (!HackathonService.instance) {
      HackathonService.instance = new HackathonService();
    }
    return HackathonService.instance;
  }

  /**
   * Get hackathon days for a specific year
   * Hackathon is always: Tuesday, Wednesday, Thursday of the first week of February
   */
  public async getHackathonDays(year: number): Promise<{ tuesday_date: string; wednesday_date: string; thursday_date: string } | null> {
    try {
      // First check if we have it in the database
      const stored = await this.db.getHackathonDays(year);
      if (stored) {
        return stored;
      }

      // Calculate hackathon days for the year
      const hackathonDays = this.calculateHackathonDays(year);
      
      // Store in database for future use
      await this.db.setHackathonDays(
        year,
        hackathonDays.tuesday_date,
        hackathonDays.wednesday_date,
        hackathonDays.thursday_date
      );

      return hackathonDays;
    } catch (error) {
      console.error('Error getting hackathon days:', error);
      throw error;
    }
  }

  /**
   * Calculate hackathon days for a given year
   * Hackathon is always: Tuesday, Wednesday, Thursday of the first week of February
   */
  private calculateHackathonDays(year: number): { tuesday_date: string; wednesday_date: string; thursday_date: string } {
    // Find the first Tuesday of February
    const february1 = new Date(year, 1, 1); // Month is 0-indexed, so 1 = February
    const dayOfWeek = february1.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to add to get to the first Tuesday
    // If Feb 1 is Sunday (0), add 2 days to get Tuesday (2)
    // If Feb 1 is Monday (1), add 1 day to get Tuesday (2)
    // If Feb 1 is Tuesday (2), add 0 days
    // If Feb 1 is Wednesday (3), add 6 days to get to next Tuesday
    // etc.
    let daysToAdd = 0;
    if (dayOfWeek <= 2) {
      daysToAdd = 2 - dayOfWeek;
    } else {
      daysToAdd = 9 - dayOfWeek; // 7 + (2 - dayOfWeek)
    }

    const firstTuesday = new Date(february1);
    firstTuesday.setDate(february1.getDate() + daysToAdd);

    const wednesday = new Date(firstTuesday);
    wednesday.setDate(firstTuesday.getDate() + 1);

    const thursday = new Date(firstTuesday);
    thursday.setDate(firstTuesday.getDate() + 2);

    return {
      tuesday_date: firstTuesday.toISOString().split('T')[0], // YYYY-MM-DD format
      wednesday_date: wednesday.toISOString().split('T')[0],
      thursday_date: thursday.toISOString().split('T')[0]
    };
  }

  /**
   * Get all hackathon days from the database
   */
  public async getAllHackathonDays(): Promise<Array<{ year: number; tuesday_date: string; wednesday_date: string; thursday_date: string }>> {
    try {
      return await this.db.getAllHackathonDays();
    } catch (error) {
      console.error('Error getting all hackathon days:', error);
      throw error;
    }
  }

  /**
   * Check if a given date is a hackathon day
   */
  public async isHackathonDay(date: Date): Promise<boolean> {
    try {
      const year = date.getFullYear();
      const hackathonDays = await this.getHackathonDays(year);
      
      if (!hackathonDays) {
        return false;
      }

      const dateString = date.toISOString().split('T')[0];
      return dateString === hackathonDays.tuesday_date || 
             dateString === hackathonDays.wednesday_date || 
             dateString === hackathonDays.thursday_date;
    } catch (error) {
      console.error('Error checking if date is hackathon day:', error);
      return false;
    }
  }

  /**
   * Get the number of hackathon days in a date range
   */
  public async getHackathonDaysInRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      let hackathonDays = 0;
      
      // Check each year in the range
      for (let year = startYear; year <= endYear; year++) {
        const yearHackathonDays = await this.getHackathonDays(year);
        
        if (yearHackathonDays) {
          const tuesday = new Date(yearHackathonDays.tuesday_date);
          const wednesday = new Date(yearHackathonDays.wednesday_date);
          const thursday = new Date(yearHackathonDays.thursday_date);
          
          // Check if each hackathon day falls within the range
          if (tuesday >= startDate && tuesday <= endDate) hackathonDays++;
          if (wednesday >= startDate && wednesday <= endDate) hackathonDays++;
          if (thursday >= startDate && thursday <= endDate) hackathonDays++;
        }
      }
      
      return hackathonDays;
    } catch (error) {
      console.error('Error getting hackathon days in range:', error);
      return 0;
    }
  }
}
