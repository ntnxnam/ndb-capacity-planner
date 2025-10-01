#!/usr/bin/env node

/**
 * Unit Tests for HolidayService
 * Tests the holiday calculation logic for NDB capacity planning
 */

const { getHolidays, getHackathonDays } = require('../../../frontend/src/lib/holidayService');

describe('HolidayService', () => {
  describe('getHolidays', () => {
    it('should calculate holidays for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBeGreaterThan(0);
      expect(typeof holidays).toBe('number');
    });

    it('should return 0 for date range with no holidays', async () => {
      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-03');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(0);
    });

    it('should include New Year\'s Day', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(1);
    });

    it('should include Christmas Day', async () => {
      const startDate = new Date('2024-12-25');
      const endDate = new Date('2024-12-25');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(1);
    });

    it('should include Diwali (Indian festival)', async () => {
      // Diwali 2024 is around November 1st
      const startDate = new Date('2024-11-01');
      const endDate = new Date('2024-11-01');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(1);
    });

    it('should include year-end slowdown', async () => {
      const startDate = new Date('2024-12-20');
      const endDate = new Date('2024-12-31');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBeGreaterThan(0);
    });

    it('should handle leap year correctly', async () => {
      const startDate = new Date('2024-02-29');
      const endDate = new Date('2024-02-29');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(0); // Feb 29 is not a holiday
    });

    it('should handle different years', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      
      const holidays2023 = await getHolidays(startDate, endDate);
      
      const startDate2024 = new Date('2024-01-01');
      const endDate2024 = new Date('2024-12-31');
      
      const holidays2024 = await getHolidays(startDate2024, endDate2024);
      
      expect(holidays2023).toBeGreaterThan(0);
      expect(holidays2024).toBeGreaterThan(0);
      expect(holidays2023).not.toBe(holidays2024); // Different years may have different holiday counts
    });
  });

  describe('getHackathonDays', () => {
    it('should return 3 hackathon days for 2024', () => {
      const year = 2024;
      const hackathonDays = getHackathonDays(year);
      
      expect(hackathonDays).toBe(3);
    });

    it('should return 3 hackathon days for 2025', () => {
      const year = 2025;
      const hackathonDays = getHackathonDays(year);
      
      expect(hackathonDays).toBe(3);
    });

    it('should return 3 hackathon days for any year', () => {
      const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
      
      years.forEach(year => {
        const hackathonDays = getHackathonDays(year);
        expect(hackathonDays).toBe(3);
      });
    });

    it('should handle leap years correctly', () => {
      const leapYears = [2020, 2024, 2028];
      
      leapYears.forEach(year => {
        const hackathonDays = getHackathonDays(year);
        expect(hackathonDays).toBe(3);
      });
    });

    it('should handle non-leap years correctly', () => {
      const nonLeapYears = [2021, 2022, 2023, 2025, 2026, 2027];
      
      nonLeapYears.forEach(year => {
        const hackathonDays = getHackathonDays(year);
        expect(hackathonDays).toBe(3);
      });
    });
  });

  describe('Holiday calculation edge cases', () => {
    it('should handle single day range', async () => {
      const date = new Date('2024-07-04'); // July 4th (Independence Day)
      const holidays = await getHolidays(date, date);
      
      expect(holidays).toBe(1);
    });

    it('should handle weekend holidays', async () => {
      // Test a holiday that falls on weekend
      const startDate = new Date('2024-01-01'); // New Year's Day 2024 is a Monday
      const endDate = new Date('2024-01-01');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(1);
    });

    it('should handle cross-year date ranges', async () => {
      const startDate = new Date('2023-12-25');
      const endDate = new Date('2024-01-01');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBeGreaterThan(0);
    });

    it('should handle very short date ranges', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-02');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBe(0);
    });

    it('should handle very long date ranges', async () => {
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2024-12-31');
      
      const holidays = await getHolidays(startDate, endDate);
      
      expect(holidays).toBeGreaterThan(0);
    });
  });

  describe('Performance tests', () => {
    it('should calculate holidays quickly for single year', async () => {
      const startTime = Date.now();
      
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      await getHolidays(startDate, endDate);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should calculate holidays quickly for multiple years', async () => {
      const startTime = Date.now();
      
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2024-12-31');
      await getHolidays(startDate, endDate);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });
});

// Mock Jest if not available
if (typeof jest === 'undefined') {
  global.jest = {
    fn: () => {
      const calls = [];
      const mockFn = (...args) => {
        calls.push(args);
        return Promise.resolve();
      };
      mockFn.mockResolvedValue = (value) => {
        mockFn.mockImplementation(() => Promise.resolve(value));
        return mockFn;
      };
      mockFn.mockRejectedValue = (error) => {
        mockFn.mockImplementation(() => Promise.reject(error));
        return mockFn;
      };
      mockFn.mockImplementation = (fn) => {
        mockFn.mockFn = fn;
        return mockFn;
      };
      mockFn.toHaveBeenCalledWith = (...expectedArgs) => {
        return calls.some(call => 
          call.length === expectedArgs.length && 
          call.every((arg, i) => arg === expectedArgs[i])
        );
      };
      mockFn.toHaveBeenCalled = () => calls.length > 0;
      mockFn.not = {
        toHaveBeenCalled: () => calls.length === 0
      };
      return mockFn;
    },
    doMock: () => {},
    clearAllMocks: () => {}
  };
  
  global.expect = (actual) => ({
    toEqual: (expected) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan: (expected) => {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toThrow: (expectedError) => {
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (error) {
        if (expectedError && !error.message.includes(expectedError)) {
          throw new Error(`Expected error containing "${expectedError}", got "${error.message}"`);
        }
      }
    }
  });
  
  global.describe = (name, fn) => {
    console.log(`\n🧪 ${name}`);
    fn();
  };
  
  global.it = (name, fn) => {
    try {
      fn();
      console.log(`  ✅ ${name}`);
    } catch (error) {
      console.log(`  ❌ ${name} - ${error.message}`);
    }
  };
  
  global.beforeEach = (fn) => fn();
  global.afterEach = (fn) => fn();
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running HolidayService unit tests...');
  // Note: This would need proper Jest setup to run
  console.log('Unit tests require Jest framework to run properly');
}
