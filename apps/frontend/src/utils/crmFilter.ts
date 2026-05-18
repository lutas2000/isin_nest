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
