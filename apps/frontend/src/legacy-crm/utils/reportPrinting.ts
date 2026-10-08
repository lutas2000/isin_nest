import { legacyPaperLayouts } from './legacyPaper';

// A report prints once its legacy paper layout is known and the result is
// complete; a truncated result would print a misleading total (isin_vb6
// src/utils/reportPrinting.js).
export function canPrintReport(
  reportKey: string | null | undefined,
  result: { items?: unknown; truncated?: boolean } | null | undefined,
): boolean {
  return Boolean(
    reportKey &&
      legacyPaperLayouts[reportKey] &&
      result &&
      Array.isArray(result.items) &&
      result.truncated === false,
  );
}
