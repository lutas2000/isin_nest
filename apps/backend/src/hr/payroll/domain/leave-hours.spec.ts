import { anniversaryPeriod, calculateLeaveHours, splitLeaveByDay } from './leave-hours';

const segment = { rest_time: 60, rest_time2: 60 };

describe('calculateLeaveHours', () => {
  it('floors to half hours and subtracts the noon rest when the span covers it', () => {
    expect(calculateLeaveHours('2026-06-01 08:00:00', '2026-06-01 17:00:00', segment)).toBe(8);
    expect(calculateLeaveHours('2026-06-01 08:00:00', '2026-06-01 12:00:00', segment)).toBe(4);
    expect(calculateLeaveHours('2026-06-01 13:00:00', '2026-06-01 17:20:00', segment)).toBe(4);
    expect(calculateLeaveHours('2026-06-01 11:30:00', '2026-06-01 13:00:00', segment)).toBe(0.5);
  });
  it('does not cap at 8 hours and subtracts the evening rest too', () => {
    expect(calculateLeaveHours('2026-06-01 08:00:00', '2026-06-01 21:00:00', segment)).toBe(11);
  });
  it('returns 0 for empty or inverted spans', () => {
    expect(calculateLeaveHours('2026-06-01 09:00:00', '2026-06-01 09:00:00', segment)).toBe(0);
    expect(calculateLeaveHours('2026-06-01 10:00:00', '2026-06-01 09:00:00', segment)).toBe(0);
  });
});

describe('splitLeaveByDay', () => {
  it('keeps a same-day leave as one record', () => {
    expect(splitLeaveByDay('2026-06-01 08:00:00', '2026-06-01 17:00:00')).toEqual([
      { start_time: '2026-06-01 08:00:00', end_time: '2026-06-01 17:00:00' },
    ]);
  });
  it('splits a multi-day leave into one record per day with the same clock span', () => {
    expect(splitLeaveByDay('2026-06-29 08:00:00', '2026-07-01 17:00:00')).toEqual([
      { start_time: '2026-06-29 08:00:00', end_time: '2026-06-29 17:00:00' },
      { start_time: '2026-06-30 08:00:00', end_time: '2026-06-30 17:00:00' },
      { start_time: '2026-07-01 08:00:00', end_time: '2026-07-01 17:00:00' },
    ]);
  });
});

describe('anniversaryPeriod', () => {
  it('uses the hire-date anniversary containing the date', () => {
    expect(anniversaryPeriod('2020-03-15', '2026-06-01')).toEqual({ start: '2026-03-15', end: '2027-03-14' });
    expect(anniversaryPeriod('2020-03-15', '2026-02-01')).toEqual({ start: '2025-03-15', end: '2026-03-14' });
    expect(anniversaryPeriod('2020-03-15', '2020-01-01')).toEqual({ start: '2020-03-15', end: '2021-03-14' });
  });
});
