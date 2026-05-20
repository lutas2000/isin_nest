/** 報價備註範本第五條「交貨期限」預設工作天數 */
export const DEFAULT_QUOTE_NOTES_WORK_DAYS = 7;

export interface BuildQuoteNotesTemplateOpts {
  /** 有填入時：一、以上報價有效期限{n}天。未填時保留「期限  天」雙空格句式 */
  validDays?: number;
  /** 五、交貨期限工作天數 */
  workDays: number;
}

export function buildQuoteNotesTemplate(opts: BuildQuoteNotesTemplateOpts): string {
  const { validDays, workDays } = opts;
  const wd = Number.isFinite(workDays) && workDays >= 1 ? Math.floor(workDays) : 1;

  let line1: string;
  if (
    validDays != null &&
    Number.isFinite(validDays) &&
    validDays >= 1
  ) {
    const vd = Math.floor(Number(validDays));
    line1 = `一、以上報價有效期限${vd}天。`;
  } else {
    line1 = '一、以上報價有效期限  天。';
  }

  return [
    line1,
    '二、以上報價均不含5％營業稅。',
    '三、以上報價含材料費、切割費、折工。',
    '四、付款條件：代料加工，月結。',
    `五、交貨期限：自接訂貨確認單後 ${wd} 個工作天。`,
  ].join('\n');
}
