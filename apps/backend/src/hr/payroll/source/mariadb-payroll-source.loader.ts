import { Injectable } from '@nestjs/common';
import { LegacyStaffDbService } from '../../../legacy-staff/legacy-staff-db.service';
import { PayrollPeriod, PayrollSourceData, PayrollVariant } from '../domain/types';
import { loadPayrollSourceFromMariadb } from './mariadb-payroll-source';
import { PayrollSourceLoader } from './payroll-source.loader';

/** 以 `SOURCE_DB_*` 的舊 MariaDB 為計算輸入來源。 */
@Injectable()
export class MariadbPayrollSourceLoader implements PayrollSourceLoader {
  readonly source = 'mariadb' as const;

  constructor(private readonly db: LegacyStaffDbService) {}

  load(period: PayrollPeriod, variant: PayrollVariant): Promise<PayrollSourceData> {
    return loadPayrollSourceFromMariadb(this.db, period, variant);
  }
}
