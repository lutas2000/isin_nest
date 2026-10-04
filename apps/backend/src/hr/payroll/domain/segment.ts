import { SegmentRow } from './types';

/**
 * 段別選取。依 2026-10-04 決議「照舊」，三種用法各自保留舊程式的取法：
 *
 * - `pickDaySegment`：逐日工時與請假登錄用，`create_date <= 當日` 的最新一筆
 *   （Segment.setDefaltSegment）。
 * - `pickLatestSegment`：薪資表的夜班與責任制旗標用，不看日期的最新一筆
 *   （WageReport.getSegment）。
 * - `pickOldestSegment`：逐日工時分類的責任制旗標用，最舊的一筆
 *   （HourPage.caculate 的 `ORDER BY create_date LIMIT 0,1`）。
 */

function ofStaff(segments: SegmentRow[], name: string): SegmentRow[] {
  return segments.filter((segment) => segment.name === name);
}

function byCreateDateDesc(a: SegmentRow, b: SegmentRow): number {
  if (a.create_date === b.create_date) return b.id - a.id;
  return a.create_date < b.create_date ? 1 : -1;
}

export function pickDaySegment(
  segments: SegmentRow[],
  name: string,
  date: string,
): SegmentRow | null {
  const candidates = ofStaff(segments, name)
    .filter((segment) => segment.create_date <= date)
    .sort(byCreateDateDesc);
  return candidates[0] ?? null;
}

export function pickLatestSegment(
  segments: SegmentRow[],
  name: string,
): SegmentRow | null {
  const candidates = ofStaff(segments, name).sort(byCreateDateDesc);
  return candidates[0] ?? null;
}

export function pickOldestSegment(
  segments: SegmentRow[],
  name: string,
): SegmentRow | null {
  const candidates = ofStaff(segments, name).sort(byCreateDateDesc);
  return candidates[candidates.length - 1] ?? null;
}
