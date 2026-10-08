// 營業稅 as the legacy 出貨登錄 works it out from the line totals (isin_vb6
// src/utils/salesTax.js, checked on the 10/02 MDB copy): 外加 adds 5% rounded
// half up (147,455 of 147,668 sales); 內含 takes 貨款 = total ÷ 1.05 rounded
// and the rest as tax (12 of 12); other kinds have no tax.
export const SALES_TAX_RATE = 0.05;

export function splitSaleTax(
  lineTotal: unknown,
  taxMode: unknown,
): { amount: number; tax: number } {
  const total = Number(lineTotal) || 0;
  const mode = String(taxMode ?? '').trim();
  if (mode === '外加')
    return {
      amount: total,
      tax: Math.sign(total) * Math.round(Math.abs(total) * SALES_TAX_RATE),
    };
  if (mode === '內含') {
    const amount =
      Math.sign(total) * Math.round(Math.abs(total) / (1 + SALES_TAX_RATE));
    return { amount, tax: total - amount };
  }
  return { amount: total, tax: 0 };
}
