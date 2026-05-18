import type { CrmFilterDefinition } from '@/types/crm-filter';

export function matchesDateRange(
  dateValue: string | undefined,
  from: string,
  to: string,
): boolean {
  if (!dateValue) {
    return false;
  }

  const normalizedDate = dateValue.slice(0, 10);

  if (from && normalizedDate < from) {
    return false;
  }

  if (to && normalizedDate > to) {
    return false;
  }

  return true;
}

export function hasDateRangeValue(from: string, to: string): boolean {
  return Boolean(from || to);
}

export function getDefaultChipFilterValues(
  filters: CrmFilterDefinition[],
  currentValues: Record<string, string> = {},
): Record<string, string> {
  const next = { ...currentValues };

  for (const filter of filters) {
    if (filter.type === 'select') {
      next[filter.key] = '';
    } else {
      next[filter.fromKey] = '';
      next[filter.toKey] = '';
    }
  }

  return next;
}

function formatDateYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthDateRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: formatDateYmd(from), to: formatDateYmd(to) };
}

export function getCurrentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  return getMonthDateRange(now.getFullYear(), now.getMonth());
}

export function getReferenceMonthFromRange(
  from: string,
  to: string,
): { year: number; month: number } {
  const source = from || to;
  if (source) {
    const [year, month] = source.slice(0, 7).split('-').map(Number);
    return { year, month: month - 1 };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftMonthDateRange(
  from: string,
  to: string,
  deltaMonths: number,
): { from: string; to: string } {
  const { year, month } = getReferenceMonthFromRange(from, to);
  const target = new Date(year, month + deltaMonths, 1);
  return getMonthDateRange(target.getFullYear(), target.getMonth());
}

export function hasActiveChipFilters(
  filters: CrmFilterDefinition[],
  values: Record<string, string>,
): boolean {
  return filters.some((filter) => {
    if (filter.type === 'select') {
      return Boolean((values[filter.key] ?? '').trim());
    }

    return hasDateRangeValue(values[filter.fromKey] ?? '', values[filter.toKey] ?? '');
  });
}
