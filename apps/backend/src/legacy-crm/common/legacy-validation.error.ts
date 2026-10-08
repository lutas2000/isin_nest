/** 舊版銷管的資料驗證錯誤；訊息沿用 isin_vb6，直接顯示給使用者。 */
export class LegacyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyValidationError';
  }
}
