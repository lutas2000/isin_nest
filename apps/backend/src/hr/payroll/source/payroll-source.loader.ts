import { PayrollPeriod, PayrollSourceData, PayrollVariant } from '../domain/types';
import { PayrollRunSource } from '../entities/payroll-run.entity';

/**
 * 薪資計算輸入的來源。第 2 階段只有 MariaDB 版；第 7 階段加 PostgreSQL 版後
 * 以設定切換，計算與 snapshot 流程不變。
 */
export interface PayrollSourceLoader {
  readonly source: PayrollRunSource;
  load(period: PayrollPeriod, variant: PayrollVariant): Promise<PayrollSourceData>;
}

export const PAYROLL_SOURCE_LOADER = Symbol('PAYROLL_SOURCE_LOADER');
