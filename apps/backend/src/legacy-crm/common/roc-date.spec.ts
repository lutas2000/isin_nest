import {
  displayRocDate,
  formatRocDate,
  parseRocDate,
  splitRocDate,
} from './roc-date';

describe('roc-date', () => {
  it('parses ROC dates with one- to four-digit years', () => {
    expect(parseRocDate('115.10.08')).toBe('2026-10-08');
    expect(parseRocDate('96.01.02')).toBe('2007-01-02');
    expect(parseRocDate('  99.12.31')).toBe('2010-12-31');
    expect(parseRocDate('1.01.01')).toBe('1912-01-01');
    expect(parseRocDate('7109.01.02')).toBe('9020-01-02');
  });

  it('rejects blanks, malformed text and impossible dates', () => {
    expect(parseRocDate('')).toBeNull();
    expect(parseRocDate('   ')).toBeNull();
    expect(parseRocDate(null)).toBeNull();
    expect(parseRocDate('0.01.01')).toBeNull();
    expect(parseRocDate('115.1.8')).toBeNull();
    expect(parseRocDate('115/10/08')).toBeNull();
    expect(parseRocDate('115.02.30')).toBeNull();
    expect(parseRocDate('113.02.29')).toBe('2024-02-29');
    expect(parseRocDate('8089.01.01')).toBeNull();
  });

  it('formats ISO dates back to the legacy text without padding the year', () => {
    expect(formatRocDate('2026-10-08')).toBe('115.10.08');
    expect(formatRocDate('2007-01-02')).toBe('96.01.02');
    expect(formatRocDate(new Date(2026, 9, 8))).toBe('115.10.08');
    expect(formatRocDate(null)).toBe('');
    expect(() => formatRocDate('1911-12-31')).toThrow();
  });

  it('keeps the original text only when the date cannot reproduce it', () => {
    expect(splitRocDate(' 115.10.08')).toEqual({
      date: '2026-10-08',
      raw: null,
    });
    expect(splitRocDate(' ')).toEqual({ date: null, raw: null });
    expect(splitRocDate('096.01.02')).toEqual({
      date: '2007-01-02',
      raw: '096.01.02',
    });
    expect(splitRocDate('115.13.01')).toEqual({ date: null, raw: '115.13.01' });
  });

  it('displays the original text first', () => {
    expect(displayRocDate('2007-01-02', '096.01.02')).toBe('096.01.02');
    expect(displayRocDate('2007-01-02', null)).toBe('96.01.02');
    expect(displayRocDate(null, null)).toBe('');
  });
});
