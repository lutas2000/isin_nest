import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL `numeric/decimal` 會以字串回傳（避免浮點誤差）。
 * 專案內多數欄位以 number 使用，因此提供統一轉換器。
 */
export const numericTransformer: ValueTransformer = {
  to: (value: unknown) => value,
  from: (value: unknown) => {
    if (value === null || value === undefined) return value as null | undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return value as unknown;
  },
};

