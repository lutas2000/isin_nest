import { ValueTransformer } from 'typeorm';
import { LegacyValidationError } from './legacy-validation.error';

/**
 * 舊版金額與數量以「× 10,000 的整數」儲存（`*_units` 欄，PostgreSQL bigint），
 * 沿用 isin_vb6 的整數精度策略，避免重算時出現小數誤差。
 */
export const UNITS_PER_ONE = 10_000;

// 與 isin_vb6 currencyUnits 相同：絕對值上限 9,000 億。
const MAX_AMOUNT = 900_000_000_000;

/** bigint 欄在 node-postgres 會以字串回傳；units 不超過 Number.MAX_SAFE_INTEGER，轉回 number。 */
export const bigintNumberTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null) =>
    value == null ? value : Number(value),
};

/** 文字或數字轉成 units；空白視為 0。 */
export function toUnits(label: string, value: unknown): number {
  const amount = value == null || value === '' ? 0 : Number(value);
  if (!Number.isFinite(amount) || Math.abs(amount) > MAX_AMOUNT) {
    throw new LegacyValidationError(`${label}必須是有效金額`);
  }
  return Math.round(amount * UNITS_PER_ONE);
}

export function fromUnits(units: number): number {
  return units / UNITS_PER_ONE;
}

/** 數量 × 單價（皆為 units），四捨五入回 units。 */
export function multiplyUnits(
  quantityUnits: number,
  priceUnits: number,
): number {
  const result = (BigInt(quantityUnits) * BigInt(priceUnits) + 5000n) / 10000n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new LegacyValidationError('明細小計超出可儲存範圍');
  }
  return Number(result);
}
