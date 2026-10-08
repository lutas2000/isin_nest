// 民國 dates of the report dialogs (isin_vb6 src/utils/reportDates.js).
export function formatRocDate(date: Date): string {
  const year = date.getFullYear() - 1911;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function defaultReportDateRange(today = new Date()): {
  date_from: string;
  date_to: string;
} {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastDayOfPreviousMonth = new Date(
    end.getFullYear(),
    end.getMonth(),
    0,
  ).getDate();
  const start = new Date(
    end.getFullYear(),
    end.getMonth() - 1,
    Math.min(end.getDate(), lastDayOfPreviousMonth),
  );
  return {
    date_from: formatRocDate(start),
    date_to: formatRocDate(end),
  };
}

interface ReportWithFilters {
  filters?: { type?: string; from?: string; to?: string }[];
}

export function defaultReportFilters(
  report: ReportWithFilters | null | undefined,
  today = new Date(),
): Record<string, string> {
  const hasDateRange = report?.filters?.some(
    (field) =>
      field.type === 'range' &&
      field.from === 'date_from' &&
      field.to === 'date_to',
  );
  return hasDateRange ? defaultReportDateRange(today) : {};
}
