#!/usr/bin/env node

/**
 * Unit Tests for HackathonService
 * Tests the hackathon days calculation and database operations
 */

const { HackathonService } = require('../../../backend/src/services/hackathonService');

describe('HackathonService', () => {
  let hackathonService;
  let mockDb;

  beforeEach(() => {
    // Mock DatabaseManager
    mockDb = {
      getHackathonDays: jest.fn(),
      setHackathonDays: jest.fn(),
      getAllHackathonDays: jest.fn()
    };
    
    // Mock the DatabaseManager.getInstance() method
    jest.doMock('../../../backend/src/database/DatabaseManager', () => ({
      DatabaseManager: {
        getInstance: () => mockDb
      }
    }));

    hackathonService = new HackathonService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHackathonDays', () => {
    it('should return stored hackathon days from database', async () => {
      const year = 2024;
      const storedDays = {
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      };

      mockDb.getHackathonDays.mockResolvedValue(storedDays);

      const result = await hackathonService.getHackathonDays(year);

      expect(result).toEqual(storedDays);
      expect(mockDb.getHackathonDays).toHaveBeenCalledWith(year);
      expect(mockDb.setHackathonDays).not.toHaveBeenCalled();
    });

    it('should calculate and store hackathon days when not in database', async () => {
      const year = 2024;
      mockDb.getHackathonDays.mockResolvedValue(null);
      mockDb.setHackathonDays.mockResolvedValue();

      const result = await hackathonService.getHackathonDays(year);

      expect(result).toEqual({
        tuesday_date: '2024-02-06', // First Tuesday of February 2024
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });
      expect(mockDb.setHackathonDays).toHaveBeenCalledWith(
        year,
        '2024-02-06',
        '2024-02-07',
        '2024-02-08'
      );
    });

    it('should handle database errors gracefully', async () => {
      const year = 2024;
      mockDb.getHackathonDays.mockRejectedValue(new Error('Database error'));

      await expect(hackathonService.getHackathonDays(year)).rejects.toThrow('Database error');
    });
  });

  describe('calculateHackathonDays', () => {
    it('should calculate correct hackathon days for 2024', () => {
      const year = 2024;
      const result = hackathonService.calculateHackathonDays(year);

      expect(result).toEqual({
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });
    });

    it('should calculate correct hackathon days for 2025', () => {
      const year = 2025;
      const result = hackathonService.calculateHackathonDays(year);

      expect(result).toEqual({
        tuesday_date: '2025-02-04',
        wednesday_date: '2025-02-05',
        thursday_date: '2025-02-06'
      });
    });

    it('should calculate correct hackathon days for leap year 2024', () => {
      const year = 2024;
      const result = hackathonService.calculateHackathonDays(year);

      // February 1, 2024 is a Thursday, so first Tuesday is February 6
      expect(result.tuesday_date).toBe('2024-02-06');
    });

    it('should calculate correct hackathon days when Feb 1 is Tuesday', () => {
      const year = 2022;
      const result = hackathonService.calculateHackathonDays(year);

      // February 1, 2022 is a Tuesday
      expect(result).toEqual({
        tuesday_date: '2022-02-01',
        wednesday_date: '2022-02-02',
        thursday_date: '2022-02-03'
      });
    });

    it('should calculate correct hackathon days when Feb 1 is Wednesday', () => {
      const year = 2023;
      const result = hackathonService.calculateHackathonDays(year);

      // February 1, 2023 is a Wednesday, so first Tuesday is February 7
      expect(result).toEqual({
        tuesday_date: '2023-02-07',
        wednesday_date: '2023-02-08',
        thursday_date: '2023-02-09'
      });
    });
  });

  describe('isHackathonDay', () => {
    beforeEach(() => {
      mockDb.getHackathonDays.mockResolvedValue({
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });
    });

    it('should return true for hackathon Tuesday', async () => {
      const date = new Date('2024-02-06');
      const result = await hackathonService.isHackathonDay(date);
      expect(result).toBe(true);
    });

    it('should return true for hackathon Wednesday', async () => {
      const date = new Date('2024-02-07');
      const result = await hackathonService.isHackathonDay(date);
      expect(result).toBe(true);
    });

    it('should return true for hackathon Thursday', async () => {
      const date = new Date('2024-02-08');
      const result = await hackathonService.isHackathonDay(date);
      expect(result).toBe(true);
    });

    it('should return false for non-hackathon day', async () => {
      const date = new Date('2024-02-09');
      const result = await hackathonService.isHackathonDay(date);
      expect(result).toBe(false);
    });

    it('should return false when hackathon days not found', async () => {
      mockDb.getHackathonDays.mockResolvedValue(null);
      const date = new Date('2024-02-06');
      const result = await hackathonService.isHackathonDay(date);
      expect(result).toBe(false);
    });
  });

  describe('getHackathonDaysInRange', () => {
    it('should count hackathon days within range', async () => {
      mockDb.getHackathonDays.mockResolvedValue({
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });

      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-10');
      
      const result = await hackathonService.getHackathonDaysInRange(startDate, endDate);
      expect(result).toBe(3);
    });

    it('should count partial hackathon days within range', async () => {
      mockDb.getHackathonDays.mockResolvedValue({
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });

      const startDate = new Date('2024-02-06');
      const endDate = new Date('2024-02-07');
      
      const result = await hackathonService.getHackathonDaysInRange(startDate, endDate);
      expect(result).toBe(2);
    });

    it('should return 0 when no hackathon days in range', async () => {
      mockDb.getHackathonDays.mockResolvedValue({
        tuesday_date: '2024-02-06',
        wednesday_date: '2024-02-07',
        thursday_date: '2024-02-08'
      });

      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-10');
      
      const result = await hackathonService.getHackathonDaysInRange(startDate, endDate);
      expect(result).toBe(0);
    });

    it('should handle multiple years in range', async () => {
      mockDb.getHackathonDays
        .mockResolvedValueOnce({
          tuesday_date: '2024-02-06',
          wednesday_date: '2024-02-07',
          thursday_date: '2024-02-08'
        })
        .mockResolvedValueOnce({
          tuesday_date: '2025-02-04',
          wednesday_date: '2025-02-05',
          thursday_date: '2025-02-06'
        });

      const startDate = new Date('2024-12-01');
      const endDate = new Date('2025-03-01');
      
      const result = await hackathonService.getHackathonDaysInRange(startDate, endDate);
      expect(result).toBe(3); // Only 2025 hackathon days are in range
    });
  });

  describe('getAllHackathonDays', () => {
    it('should return all stored hackathon days', async () => {
      const allDays = [
        { year: 2023, tuesday_date: '2023-02-07', wednesday_date: '2023-02-08', thursday_date: '2023-02-09' },
        { year: 2024, tuesday_date: '2024-02-06', wednesday_date: '2024-02-07', thursday_date: '2024-02-08' }
      ];

      mockDb.getAllHackathonDays.mockResolvedValue(allDays);

      const result = await hackathonService.getAllHackathonDays();
      expect(result).toEqual(allDays);
      expect(mockDb.getAllHackathonDays).toHaveBeenCalled();
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
  console.log('Running HackathonService unit tests...');
  // Note: This would need proper Jest setup to run
  console.log('Unit tests require Jest framework to run properly');
}
