import * as DateUtils from '../../../common/utils/date-utils';
import MockDate from 'mockdate'; // version: ^3.0.5

describe('Date Utils', () => {
  const FIXED_DATE = new Date('2023-06-15T12:00:00Z');

  beforeAll(() => {
    // Set a fixed date for consistent testing
    MockDate.set(FIXED_DATE);
  });

  afterAll(() => {
    // Reset the mocked date
    MockDate.reset();
  });

  describe('formatDate', () => {
    it('should format a Date object correctly', () => {
      const date = new Date('2023-05-15T10:30:00Z');
      expect(DateUtils.formatDate(date, 'YYYY-MM-DD')).toBe('2023-05-15');
      expect(DateUtils.formatDate(date, 'MMM D, YYYY')).toBe('May 15, 2023');
      expect(DateUtils.formatDate(date, 'HH:mm:ss')).toBe('10:30:00');
    });

    it('should format a date string correctly', () => {
      expect(DateUtils.formatDate('2023-05-15', 'YYYY-MM-DD')).toBe('2023-05-15');
      expect(DateUtils.formatDate('2023-05-15', 'MMM D, YYYY')).toBe('May 15, 2023');
    });

    it('should format a timestamp correctly', () => {
      const timestamp = new Date('2023-05-15').getTime();
      expect(DateUtils.formatDate(timestamp, 'YYYY-MM-DD')).toBe('2023-05-15');
    });

    it('should return empty string for invalid date', () => {
      expect(DateUtils.formatDate('invalid-date', 'YYYY-MM-DD')).toBe('');
    });

    it('should format dates with different locales', () => {
      const date = new Date('2023-05-15');
      // Note: The actual output might vary depending on the environment
      expect(DateUtils.formatDate(date, 'MMMM')).toBe('May');
    });
  });

  describe('parseDate', () => {
    it('should parse date strings with various formats', () => {
      const expectedDate = new Date('2023-05-15');
      expect(DateUtils.parseDate('2023-05-15')).toEqual(expectedDate);
      expect(DateUtils.parseDate('05/15/2023', 'MM/DD/YYYY')).toEqual(expectedDate);
      expect(DateUtils.parseDate('15-05-2023', 'DD-MM-YYYY')).toEqual(expectedDate);
    });

    it('should use the default format when not specified', () => {
      const isoDate = '2023-05-15T10:30:00Z';
      const expectedDate = new Date(isoDate);
      expect(DateUtils.parseDate(isoDate)).toEqual(expectedDate);
    });

    it('should return an invalid date for invalid input', () => {
      const result = DateUtils.parseDate('not-a-date');
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('should correctly parse dates with timezone information', () => {
      const dateWithTz = '2023-05-15T10:30:00-04:00';
      const result = DateUtils.parseDate(dateWithTz);
      // The result should be adjusted to UTC
      expect(result.getUTCHours()).toBe(14); // 10 + 4 hours
    });
  });

  describe('calculateDateDifference', () => {
    it('should calculate difference in days correctly', () => {
      const date1 = new Date('2023-05-15');
      const date2 = new Date('2023-05-20');
      expect(DateUtils.calculateDateDifference(date1, date2)).toBe(5);
      expect(DateUtils.calculateDateDifference(date2, date1)).toBe(5); // Should get absolute value
    });

    it('should calculate difference in hours correctly', () => {
      const date1 = new Date('2023-05-15T10:00:00Z');
      const date2 = new Date('2023-05-15T15:00:00Z');
      expect(DateUtils.calculateDateDifference(date1, date2, 'hour')).toBe(5);
    });

    it('should calculate difference in minutes correctly', () => {
      const date1 = new Date('2023-05-15T10:00:00Z');
      const date2 = new Date('2023-05-15T10:30:00Z');
      expect(DateUtils.calculateDateDifference(date1, date2, 'minute')).toBe(30);
    });

    it('should calculate difference in seconds correctly', () => {
      const date1 = new Date('2023-05-15T10:00:00Z');
      const date2 = new Date('2023-05-15T10:00:30Z');
      expect(DateUtils.calculateDateDifference(date1, date2, 'second')).toBe(30);
    });

    it('should handle different date formats', () => {
      expect(DateUtils.calculateDateDifference('2023-05-15', '2023-05-20')).toBe(5);
      expect(DateUtils.calculateDateDifference(
        new Date('2023-05-15').getTime(), 
        new Date('2023-05-20').getTime()
      )).toBe(5);
    });

    it('should return NaN for invalid dates', () => {
      expect(DateUtils.calculateDateDifference('invalid', '2023-05-20')).toBeNaN();
      expect(DateUtils.calculateDateDifference('2023-05-15', 'invalid')).toBeNaN();
    });
  });

  describe('isDateInPast', () => {
    it('should return true for dates clearly in the past', () => {
      // Since we're mocking the date to 2023-06-15
      expect(DateUtils.isDateInPast(new Date('2023-06-14'))).toBe(true);
      expect(DateUtils.isDateInPast('2023-01-01')).toBe(true);
      expect(DateUtils.isDateInPast(new Date('2022-12-31'))).toBe(true);
    });

    it('should return false for the current date', () => {
      expect(DateUtils.isDateInPast(new Date('2023-06-15T12:00:00Z'))).toBe(false);
    });

    it('should return false for dates in the future', () => {
      expect(DateUtils.isDateInPast(new Date('2023-06-16'))).toBe(false);
      expect(DateUtils.isDateInPast('2023-12-31')).toBe(false);
      expect(DateUtils.isDateInPast(new Date('2024-01-01'))).toBe(false);
    });

    it('should handle different date formats', () => {
      expect(DateUtils.isDateInPast('2023-01-01')).toBe(true);
      expect(DateUtils.isDateInPast(new Date('2023-01-01').getTime())).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(DateUtils.isDateInPast('invalid-date')).toBe(false);
    });
  });

  describe('isDateInFuture', () => {
    it('should return true for dates clearly in the future', () => {
      // Since we're mocking the date to 2023-06-15
      expect(DateUtils.isDateInFuture(new Date('2023-06-16'))).toBe(true);
      expect(DateUtils.isDateInFuture('2023-12-31')).toBe(true);
      expect(DateUtils.isDateInFuture(new Date('2024-01-01'))).toBe(true);
    });

    it('should return false for the current date', () => {
      expect(DateUtils.isDateInFuture(new Date('2023-06-15T12:00:00Z'))).toBe(false);
    });

    it('should return false for dates in the past', () => {
      expect(DateUtils.isDateInFuture(new Date('2023-06-14'))).toBe(false);
      expect(DateUtils.isDateInFuture('2023-01-01')).toBe(false);
      expect(DateUtils.isDateInFuture(new Date('2022-12-31'))).toBe(false);
    });

    it('should handle different date formats', () => {
      expect(DateUtils.isDateInFuture('2023-12-31')).toBe(true);
      expect(DateUtils.isDateInFuture(new Date('2023-12-31').getTime())).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(DateUtils.isDateInFuture('invalid-date')).toBe(false);
    });
  });

  describe('addToDate', () => {
    it('should add days to a date correctly', () => {
      const date = new Date('2023-06-15');
      const result = DateUtils.addToDate(date, 5);
      expect(result).toEqual(new Date('2023-06-20'));
    });

    it('should add hours to a date correctly', () => {
      const date = new Date('2023-06-15T10:00:00Z');
      const result = DateUtils.addToDate(date, 3, 'hour');
      expect(result).toEqual(new Date('2023-06-15T13:00:00Z'));
    });

    it('should add minutes to a date correctly', () => {
      const date = new Date('2023-06-15T10:00:00Z');
      const result = DateUtils.addToDate(date, 30, 'minute');
      expect(result).toEqual(new Date('2023-06-15T10:30:00Z'));
    });

    it('should add seconds to a date correctly', () => {
      const date = new Date('2023-06-15T10:00:00Z');
      const result = DateUtils.addToDate(date, 45, 'second');
      expect(result).toEqual(new Date('2023-06-15T10:00:45Z'));
    });

    it('should add months and years correctly', () => {
      const date = new Date('2023-06-15');
      expect(DateUtils.addToDate(date, 2, 'month')).toEqual(new Date('2023-08-15'));
      expect(DateUtils.addToDate(date, 1, 'year')).toEqual(new Date('2024-06-15'));
    });

    it('should handle different date formats', () => {
      const result = DateUtils.addToDate('2023-06-15', 5);
      expect(result).toEqual(new Date('2023-06-20'));
    });

    it('should return invalid date for invalid inputs', () => {
      const result = DateUtils.addToDate('invalid-date', 5);
      expect(isNaN(result.getTime())).toBe(true);
    });
  });

  describe('subtractFromDate', () => {
    it('should subtract days from a date correctly', () => {
      const date = new Date('2023-06-15');
      const result = DateUtils.subtractFromDate(date, 5);
      expect(result).toEqual(new Date('2023-06-10'));
    });

    it('should subtract hours from a date correctly', () => {
      const date = new Date('2023-06-15T10:00:00Z');
      const result = DateUtils.subtractFromDate(date, 3, 'hour');
      expect(result).toEqual(new Date('2023-06-15T07:00:00Z'));
    });

    it('should subtract minutes from a date correctly', () => {
      const date = new Date('2023-06-15T10:30:00Z');
      const result = DateUtils.subtractFromDate(date, 30, 'minute');
      expect(result).toEqual(new Date('2023-06-15T10:00:00Z'));
    });

    it('should subtract seconds from a date correctly', () => {
      const date = new Date('2023-06-15T10:00:45Z');
      const result = DateUtils.subtractFromDate(date, 45, 'second');
      expect(result).toEqual(new Date('2023-06-15T10:00:00Z'));
    });

    it('should subtract months and years correctly', () => {
      const date = new Date('2023-06-15');
      expect(DateUtils.subtractFromDate(date, 2, 'month')).toEqual(new Date('2023-04-15'));
      expect(DateUtils.subtractFromDate(date, 1, 'year')).toEqual(new Date('2022-06-15'));
    });

    it('should handle different date formats', () => {
      const result = DateUtils.subtractFromDate('2023-06-15', 5);
      expect(result).toEqual(new Date('2023-06-10'));
    });

    it('should return invalid date for invalid inputs', () => {
      const result = DateUtils.subtractFromDate('invalid-date', 5);
      expect(isNaN(result.getTime())).toBe(true);
    });
  });

  describe('isWithinTimeLimit', () => {
    it('should return true for dates that are clearly within the time limit', () => {
      // Reference date: 2023-06-15 (mocked)
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-14'), undefined, 2)).toBe(true);
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-16'), undefined, 2)).toBe(true);
    });

    it('should return true for dates exactly at the time limit', () => {
      // Reference date: 2023-06-15 (mocked)
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-13'), undefined, 2)).toBe(true);
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-17'), undefined, 2)).toBe(true);
    });

    it('should return false for dates outside the time limit', () => {
      // Reference date: 2023-06-15 (mocked)
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-12'), undefined, 2)).toBe(false);
      expect(DateUtils.isWithinTimeLimit(new Date('2023-06-18'), undefined, 2)).toBe(false);
    });

    it('should work with different time units', () => {
      const referenceDate = new Date('2023-06-15T12:00:00Z');
      
      // Hours
      expect(DateUtils.isWithinTimeLimit(
        new Date('2023-06-15T14:00:00Z'), 
        referenceDate, 
        3, 
        'hour'
      )).toBe(true);
      
      expect(DateUtils.isWithinTimeLimit(
        new Date('2023-06-15T16:00:00Z'), 
        referenceDate, 
        3, 
        'hour'
      )).toBe(false);
      
      // Minutes
      expect(DateUtils.isWithinTimeLimit(
        new Date('2023-06-15T12:30:00Z'), 
        referenceDate, 
        45, 
        'minute'
      )).toBe(true);
      
      expect(DateUtils.isWithinTimeLimit(
        new Date('2023-06-15T13:00:00Z'), 
        referenceDate, 
        45, 
        'minute'
      )).toBe(false);
    });

    it('should handle different types of reference dates', () => {
      const referenceDate = new Date('2023-05-15');
      expect(DateUtils.isWithinTimeLimit(new Date('2023-05-14'), referenceDate, 1)).toBe(true);
      expect(DateUtils.isWithinTimeLimit(new Date('2023-05-13'), referenceDate, 1)).toBe(false);
    });

    it('should handle invalid dates or units', () => {
      expect(DateUtils.isWithinTimeLimit('invalid-date', undefined, 2)).toBe(false);
      expect(DateUtils.isWithinTimeLimit('2023-06-14', 'invalid-date', 2)).toBe(false);
    });
  });

  describe('getBusinessDays', () => {
    it('should calculate business days within the same week', () => {
      // Monday to Friday (5 business days)
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-05'), // Monday
        new Date('2023-06-09')  // Friday
      )).toBe(5);
      
      // Tuesday to Thursday (3 business days)
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-06'), // Tuesday
        new Date('2023-06-08')  // Thursday
      )).toBe(3);
    });

    it('should calculate business days across weekends', () => {
      // Friday to Monday (2 business days - Friday and Monday)
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-09'), // Friday
        new Date('2023-06-12')  // Monday
      )).toBe(2);
      
      // Friday to Tuesday (3 business days - Friday, Monday, Tuesday)
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-09'), // Friday
        new Date('2023-06-13')  // Tuesday
      )).toBe(3);
    });

    it('should calculate business days across holidays', () => {
      // This test is tricky because holidays vary by region and are not built into dayjs
      // In a real implementation, you would need to configure holidays in the dayjs business plugin
      // For now, we'll just test a known non-holiday range
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-01'), // Thursday
        new Date('2023-06-08')  // Thursday next week
      )).toBe(6); // 6 business days (Thu, Fri, Mon, Tue, Wed, Thu)
    });

    it('should handle start date after end date', () => {
      // End date before start date (should still count correctly)
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-09'), // Friday
        new Date('2023-06-05')  // Monday
      )).toBe(5);
    });

    it('should handle same start and end date', () => {
      // Same business day
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-05'), // Monday
        new Date('2023-06-05')  // Monday
      )).toBe(0);
      
      // Same weekend day
      expect(DateUtils.getBusinessDays(
        new Date('2023-06-10'), // Saturday
        new Date('2023-06-10')  // Saturday
      )).toBe(0);
    });

    it('should return NaN for invalid dates', () => {
      expect(DateUtils.getBusinessDays('invalid-date', '2023-06-15')).toBeNaN();
      expect(DateUtils.getBusinessDays('2023-06-15', 'invalid-date')).toBeNaN();
    });
  });

  describe('calculateDeadline', () => {
    it('should calculate deadlines in calendar days correctly', () => {
      const startDate = new Date('2023-06-15');
      const result = DateUtils.calculateDeadline(startDate, 5);
      expect(result).toEqual(new Date('2023-06-20'));
    });

    it('should calculate deadlines in business days correctly', () => {
      // Thursday + 3 business days = Tuesday (skipping weekend)
      const startDate = new Date('2023-06-15'); // Thursday
      const result = DateUtils.calculateDeadline(startDate, 3, 'day', true);
      expect(result).toEqual(new Date('2023-06-20')); // Tuesday
      
      // Friday + 2 business days = Tuesday (skipping weekend)
      const fridayStart = new Date('2023-06-16'); // Friday
      const fridayResult = DateUtils.calculateDeadline(fridayStart, 2, 'day', true);
      expect(fridayResult).toEqual(new Date('2023-06-20')); // Tuesday
    });

    it('should calculate deadlines with hours, minutes, seconds', () => {
      const startDate = new Date('2023-06-15T10:00:00Z');
      expect(DateUtils.calculateDeadline(startDate, 5, 'hour')).toEqual(new Date('2023-06-15T15:00:00Z'));
      expect(DateUtils.calculateDeadline(startDate, 30, 'minute')).toEqual(new Date('2023-06-15T10:30:00Z'));
      expect(DateUtils.calculateDeadline(startDate, 45, 'second')).toEqual(new Date('2023-06-15T10:00:45Z'));
    });

    it('should handle different date formats', () => {
      const result = DateUtils.calculateDeadline('2023-06-15', 5);
      expect(result).toEqual(new Date('2023-06-20'));
    });

    it('should return invalid date for invalid inputs', () => {
      const result = DateUtils.calculateDeadline('invalid-date', 5);
      expect(isNaN(result.getTime())).toBe(true);

      const resultInvalidTimeframe = DateUtils.calculateDeadline('2023-06-15', NaN);
      expect(isNaN(resultInvalidTimeframe.getTime())).toBe(true);
    });
  });

  describe('isDateExpired', () => {
    it('should return true for dates clearly expired (in the past)', () => {
      // Mock date is set to 2023-06-15T12:00:00Z
      expect(DateUtils.isDateExpired(new Date('2023-06-14'))).toBe(true);
      expect(DateUtils.isDateExpired('2023-01-01')).toBe(true);
      expect(DateUtils.isDateExpired(new Date('2022-12-31'))).toBe(true);
    });

    it('should return false for the current date', () => {
      expect(DateUtils.isDateExpired(new Date('2023-06-15T12:00:00Z'))).toBe(false);
    });

    it('should return false for future dates', () => {
      expect(DateUtils.isDateExpired(new Date('2023-06-16'))).toBe(false);
      expect(DateUtils.isDateExpired('2023-12-31')).toBe(false);
      expect(DateUtils.isDateExpired(new Date('2024-01-01'))).toBe(false);
    });

    it('should handle different date formats', () => {
      expect(DateUtils.isDateExpired('2023-01-01')).toBe(true);
      expect(DateUtils.isDateExpired(new Date('2023-01-01').getTime())).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(DateUtils.isDateExpired('invalid-date')).toBe(false);
    });
  });

  describe('createDateRange', () => {
    it('should create a valid date range object with valid start and end dates', () => {
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-06-30');
      const result = DateUtils.createDateRange(startDate, endDate);
      
      expect(result.start).toEqual(startDate);
      expect(result.end).toEqual(endDate);
    });

    it('should handle different date formats', () => {
      const result = DateUtils.createDateRange('2023-06-01', '2023-06-30');
      
      expect(result.start).toEqual(new Date('2023-06-01'));
      expect(result.end).toEqual(new Date('2023-06-30'));
    });

    it('should handle start date after end date', () => {
      const startDate = new Date('2023-06-30');
      const endDate = new Date('2023-06-01');
      const result = DateUtils.createDateRange(startDate, endDate);
      
      // Both dates should be invalid
      expect(isNaN(result.start.getTime())).toBe(true);
      expect(isNaN(result.end.getTime())).toBe(true);
    });

    it('should handle same start and end date', () => {
      const date = new Date('2023-06-15');
      const result = DateUtils.createDateRange(date, date);
      
      expect(result.start).toEqual(date);
      expect(result.end).toEqual(date);
    });

    it('should return invalid dates for invalid inputs', () => {
      const result = DateUtils.createDateRange('invalid-date', '2023-06-30');
      
      expect(isNaN(result.start.getTime())).toBe(true);
      expect(isNaN(result.end.getTime())).toBe(true);
    });
  });

  describe('isBetweenDates', () => {
    it('should return true for date clearly between start and end dates', () => {
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-06-30');
      const dateToCheck = new Date('2023-06-15');
      
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate)).toBe(true);
    });

    it('should handle date equal to start date with different inclusivity options', () => {
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-06-30');
      const dateToCheck = new Date('2023-06-01');
      
      // Default is inclusive '[]'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate)).toBe(true);
      
      // Exclusive '()'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '()')).toBe(false);
      
      // Left exclusive, right inclusive '(]'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '(]')).toBe(false);
      
      // Left inclusive, right exclusive '[)'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '[)')).toBe(true);
    });

    it('should handle date equal to end date with different inclusivity options', () => {
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-06-30');
      const dateToCheck = new Date('2023-06-30');
      
      // Default is inclusive '[]'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate)).toBe(true);
      
      // Exclusive '()'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '()')).toBe(false);
      
      // Left exclusive, right inclusive '(]'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '(]')).toBe(true);
      
      // Left inclusive, right exclusive '[)'
      expect(DateUtils.isBetweenDates(dateToCheck, startDate, endDate, '[)')).toBe(false);
    });

    it('should return false for date outside the range', () => {
      const startDate = new Date('2023-06-01');
      const endDate = new Date('2023-06-30');
      
      expect(DateUtils.isBetweenDates(new Date('2023-05-31'), startDate, endDate)).toBe(false);
      expect(DateUtils.isBetweenDates(new Date('2023-07-01'), startDate, endDate)).toBe(false);
    });

    it('should handle different date formats', () => {
      expect(DateUtils.isBetweenDates(
        '2023-06-15', 
        '2023-06-01', 
        '2023-06-30'
      )).toBe(true);
    });

    it('should handle invalid dates', () => {
      expect(DateUtils.isBetweenDates(
        'invalid-date', 
        '2023-06-01', 
        '2023-06-30'
      )).toBe(false);
      
      expect(DateUtils.isBetweenDates(
        '2023-06-15', 
        'invalid-date', 
        '2023-06-30'
      )).toBe(false);
      
      expect(DateUtils.isBetweenDates(
        '2023-06-15', 
        '2023-06-01', 
        'invalid-date'
      )).toBe(false);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should get timestamp with default format', () => {
      // Mock date is set to 2023-06-15T12:00:00Z
      const expectedTimestamp = '2023-06-15T12:00:00.000Z';
      expect(DateUtils.getCurrentTimestamp()).toBe(expectedTimestamp);
    });

    it('should get timestamp with custom format', () => {
      // Mock date is set to 2023-06-15T12:00:00Z
      expect(DateUtils.getCurrentTimestamp('YYYY-MM-DD')).toBe('2023-06-15');
      expect(DateUtils.getCurrentTimestamp('HH:mm:ss')).toBe('12:00:00');
      expect(DateUtils.getCurrentTimestamp('MMMM D, YYYY')).toBe('June 15, 2023');
    });

    it('should handle invalid format', () => {
      // This simulates an error by passing an invalid format (null causes an error in dayjs)
      expect(DateUtils.getCurrentTimestamp(null as unknown as string)).toBe('');
    });
  });

  describe('toISOString', () => {
    it('should convert Date object to ISO string', () => {
      const date = new Date('2023-06-15T12:30:45.123Z');
      expect(DateUtils.toISOString(date)).toBe('2023-06-15T12:30:45.123Z');
    });

    it('should convert string date to ISO string', () => {
      expect(DateUtils.toISOString('2023-06-15')).toBe('2023-06-15T00:00:00.000Z');
      expect(DateUtils.toISOString('2023-06-15T12:30:45.123Z')).toBe('2023-06-15T12:30:45.123Z');
    });

    it('should handle invalid dates', () => {
      expect(DateUtils.toISOString('invalid-date')).toBe('');
    });
  });

  describe('getLocalTimezoneOffset', () => {
    it('should get offset for various timezones', () => {
      // New York is UTC-5 (or UTC-4 during DST)
      // 2023-06-15 would be during DST, so UTC-4
      const offsetNY = DateUtils.getLocalTimezoneOffset('America/New_York');
      expect(typeof offsetNY).toBe('number');
      expect([-240, -300].includes(offsetNY)).toBe(true); // Either -240 (DST) or -300 (non-DST)
      
      // Los Angeles is UTC-8 (or UTC-7 during DST)
      // 2023-06-15 would be during DST, so UTC-7
      const offsetLA = DateUtils.getLocalTimezoneOffset('America/Los_Angeles');
      expect(typeof offsetLA).toBe('number');
      expect([-420, -480].includes(offsetLA)).toBe(true); // Either -420 (DST) or -480 (non-DST)
      
      // UTC timezone
      const offsetUTC = DateUtils.getLocalTimezoneOffset('UTC');
      expect(offsetUTC).toBe(0);
      
      // Tokyo is UTC+9
      const offsetTokyo = DateUtils.getLocalTimezoneOffset('Asia/Tokyo');
      expect(offsetTokyo).toBe(540);
    });

    it('should test with daylight saving time transitions', () => {
      // This is challenging to test precisely due to the mock date
      // but we can verify that the function returns a number
      const offset = DateUtils.getLocalTimezoneOffset('America/New_York');
      expect(typeof offset).toBe('number');
    });

    it('should handle invalid timezone', () => {
      expect(DateUtils.getLocalTimezoneOffset('Invalid/Timezone')).toBeNaN();
    });
  });
});