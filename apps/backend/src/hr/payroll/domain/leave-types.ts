/**
 * 假別清單。順序對應舊 Excel 請假彙總列的順序（MyStrings.leaveTypes），
 * 防疫假依 2026-10-04 決議移除。
 */
export const LEAVE_TYPES = [
  '事假',
  '特休',
  '病假',
  '公假',
  '產假',
  '產檢假',
  '婚假',
  '喪假',
  '公休',
  '曠職',
  '陪產假',
  '無薪假',
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

/** 已移除的假別；舊資料出現時以無薪假計算並記錄警告。 */
export const REMOVED_LEAVE_TYPES: Record<string, LeaveType> = {
  防疫假: '無薪假',
};

export function isLeaveType(value: string): value is LeaveType {
  return (LEAVE_TYPES as readonly string[]).includes(value);
}
