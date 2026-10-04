import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { calculatePayroll } from './domain/payroll';
import {
  ManualWageFields,
  PayrollResult,
  PayrollSourceData,
} from './domain/types';
import {
  CreatePayrollRunDto,
  ManualWageMap,
  PreviewPayrollDto,
  QueryPayrollRunsDto,
} from './dto/payroll.dto';
import { PayrollRunDay } from './entities/payroll-run-day.entity';
import { PayrollRunStaff } from './entities/payroll-run-staff.entity';
import { PayrollRun } from './entities/payroll-run.entity';
import {
  buildPayrollWorkbookBuffer,
  payrollFileName,
  WorkbookDayRow,
  WorkbookStaffRow,
} from './excel/payroll-workbook.builder';
import { PayrollFileService } from './payroll-file.service';
import {
  StaffMonthSummaryView,
  toRunDayRows,
  toRunStaffRows,
  toSummaryView,
} from './payroll-run.mapper';
import {
  PAYROLL_SOURCE_LOADER,
  PayrollSourceLoader,
} from './source/payroll-source.loader';

export interface PayrollPreviewDepartment {
  department: string;
  hourSheetNames: string[];
  wageSheetNames: string[];
  days: PayrollResult['departments'][number]['days'];
  summaries: StaffMonthSummaryView[];
  wages: PayrollResult['departments'][number]['wages'];
}

export interface PayrollPreview {
  period: PayrollResult['period'];
  variant: PayrollResult['variant'];
  source: PayrollSourceLoader['source'];
  departments: PayrollPreviewDepartment[];
  warnings: string[];
}

export interface PayrollRunDetail extends PayrollRun {
  staff: PayrollRunStaff[];
  days: PayrollRunDay[];
}

const MANUAL_KEYS: Array<keyof ManualWageFields> = [
  'bonus',
  'annualLeaveAdd',
  'annualLeaveDeduct',
  'advance',
  'otherDeduction',
  'taxWithheld',
];

export interface PayrollRunFile {
  fileName: string;
  buffer: Buffer;
}

/**
 * 薪資流程：載入來源 → 純函式計算 → 存 snapshot → 從 snapshot 列產 Excel。
 * Excel 永遠由 snapshot 的 staff/day 列產生，檔案遺失時可重建。
 */
@Injectable()
export class PayrollService {
  constructor(
    @Inject(PAYROLL_SOURCE_LOADER) private readonly loader: PayrollSourceLoader,
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(PayrollRunStaff) private readonly runStaff: Repository<PayrollRunStaff>,
    @InjectRepository(PayrollRunDay) private readonly runDays: Repository<PayrollRunDay>,
    private readonly dataSource: DataSource,
    private readonly files: PayrollFileService,
  ) {}

  /** 只計算不存。 */
  async preview(dto: PreviewPayrollDto): Promise<PayrollPreview> {
    this.assertPeriod(dto.start, dto.end);
    const manual = this.normalizeManual(dto.manual);
    const input = await this.loader.load({ start: dto.start, end: dto.end }, dto.variant);
    const result = calculatePayroll(input, { departments: dto.departments, manual });
    return this.toPreview(result);
  }

  /** 載入、計算並為每個部門建立一筆 draft run。 */
  async createRuns(
    dto: CreatePayrollRunDto,
    userId: number | null,
  ): Promise<{ runs: PayrollRun[]; warnings: string[] }> {
    this.assertPeriod(dto.start, dto.end);
    const manual = this.normalizeManual(dto.manual);
    const input = await this.loader.load({ start: dto.start, end: dto.end }, dto.variant);
    const result = calculatePayroll(input, { departments: dto.departments, manual });

    const runs = await this.dataSource.transaction(async (manager) => {
      const created: PayrollRun[] = [];
      for (const department of result.departments) {
        const run = await manager.save(
          manager.create(PayrollRun, {
            periodStart: input.period.start,
            periodEnd: input.period.end,
            variant: input.variant,
            department: department.department,
            source: this.loader.source,
            status: 'draft',
            inputJson: input,
            warningsJson: result.warnings,
            filePath: null,
            fileSha256: null,
            createdBy: userId,
            finalizedBy: null,
            finalizedAt: null,
          }),
        );
        const staffRows = toRunStaffRows(input, department, manual).map((row) => ({ ...row, runId: run.id }));
        const dayRows = toRunDayRows(department).map((row) => ({ ...row, runId: run.id }));
        await manager.save(PayrollRunStaff, staffRows);
        await manager.save(PayrollRunDay, dayRows, { chunk: 500 });
        const file = await this.writeWorkbook(run, staffRows as WorkbookStaffRow[], dayRows as WorkbookDayRow[]);
        await manager.update(PayrollRun, { id: run.id }, file);
        created.push(this.withoutInput({ ...run, ...file }));
      }
      return created;
    });
    return { runs, warnings: result.warnings };
  }

  async findRuns(query: QueryPayrollRunsDto): Promise<PayrollRun[]> {
    const where: FindOptionsWhere<PayrollRun> = {};
    if (query.start) where.periodStart = query.start;
    if (query.variant) where.variant = query.variant;
    if (query.department) where.department = query.department;
    if (query.status) where.status = query.status;
    return this.runs.find({
      where,
      order: { periodStart: 'DESC', id: 'DESC' },
      take: Math.min(Math.max(query.limit ?? 100, 1), 500),
    });
  }

  async findRun(id: number): Promise<PayrollRunDetail> {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`找不到薪資 run ${id}`);
    const [staff, days] = await Promise.all([
      this.runStaff.find({ where: { runId: id }, order: { wageOrder: 'ASC' } }),
      this.runDays.find({ where: { runId: id }, order: { date: 'ASC', id: 'ASC' } }),
    ]);
    return Object.assign(run, { staff, days });
  }

  /** 讀回 snapshot 的完整輸入（重算與 Excel 產出用）。 */
  async getInput(id: number): Promise<PayrollSourceData> {
    const row = await this.runs
      .createQueryBuilder('run')
      .select('run.inputJson', 'inputJson')
      .where('run.id = :id', { id })
      .getRawOne<{ inputJson: PayrollSourceData }>();
    if (!row) throw new NotFoundException(`找不到薪資 run ${id}`);
    return row.inputJson;
  }

  /** 更新 draft run 的手動欄位並以 snapshot 內的輸入重算薪資項目。 */
  async updateManual(id: number, patch: ManualWageMap): Promise<PayrollRunDetail> {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`找不到薪資 run ${id}`);
    if (run.status === 'final') throw new ConflictException(`薪資 run ${id} 已定稿，不可修改`);

    const incoming = this.normalizeManual(patch);
    const existing = await this.runStaff.find({ where: { runId: id } });
    const names = new Set(existing.map((row) => row.name));
    for (const name of Object.keys(incoming)) {
      if (!names.has(name)) throw new BadRequestException(`${name} 不在此薪資 run 內`);
    }
    const manual: ManualWageMap = {};
    for (const row of existing) {
      manual[row.name] = { ...row.manualJson, ...incoming[row.name] };
    }

    const input = await this.getInput(id);
    const result = calculatePayroll(input, { departments: [run.department], manual });
    const department = result.departments[0];

    const staffRows = toRunStaffRows(input, department, manual).map((row) => ({ ...row, runId: id }));
    const dayRows = await this.runDays.find({ where: { runId: id }, order: { date: 'ASC', id: 'ASC' } });
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(PayrollRunStaff, { runId: id });
      await manager.save(PayrollRunStaff, staffRows);
      const file = await this.writeWorkbook(run, staffRows as WorkbookStaffRow[], dayRows);
      await manager.update(PayrollRun, { id }, { warningsJson: result.warnings, ...file });
    });
    return this.findRun(id);
  }

  /** 取得 xlsx；檔案不存在或與記錄的 sha256 不符時從 snapshot 重建並重新存檔。 */
  async getFile(id: number): Promise<PayrollRunFile> {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`找不到薪資 run ${id}`);
    const fileName = payrollFileName({ start: run.periodStart, end: run.periodEnd }, run.variant, run.id);
    const existing = await this.files.read(run.filePath, run.fileSha256);
    if (existing) return { fileName, buffer: existing };

    const [staff, days] = await Promise.all([
      this.runStaff.find({ where: { runId: id }, order: { wageOrder: 'ASC' } }),
      this.runDays.find({ where: { runId: id }, order: { date: 'ASC', id: 'ASC' } }),
    ]);
    const buffer = await this.buildWorkbook(run, staff, days);
    const file = await this.files.write(this.files.resolve(run.periodStart, fileName), buffer);
    await this.runs.update({ id }, file);
    return { fileName, buffer };
  }

  async finalize(id: number, userId: number | null): Promise<PayrollRun> {
    const run = await this.runs.findOne({ where: { id } });
    if (!run) throw new NotFoundException(`找不到薪資 run ${id}`);
    if (run.status === 'final') throw new ConflictException(`薪資 run ${id} 已定稿`);
    await this.runs.update({ id }, { status: 'final', finalizedBy: userId, finalizedAt: new Date() });
    return (await this.runs.findOne({ where: { id } })) as PayrollRun;
  }

  /** 某期間是否已有定稿 run（請假與外帳工時維護用來擋修改）。 */
  async hasFinalRunCovering(date: string): Promise<boolean> {
    const count = await this.runs
      .createQueryBuilder('run')
      .where('run.status = :status', { status: 'final' })
      .andWhere('run.period_start <= :date AND run.period_end >= :date', { date })
      .getCount();
    return count > 0;
  }

  private assertPeriod(start: string, end: string): void {
    if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
      throw new BadRequestException('日期格式錯誤');
    }
    if (start > end) throw new BadRequestException('start 不可晚於 end');
  }

  /** 檢查手動欄位：鍵必須是六個手動欄位之一，值必須是有限數字。 */
  private normalizeManual(manual?: ManualWageMap): ManualWageMap {
    const result: ManualWageMap = {};
    for (const [name, fields] of Object.entries(manual ?? {})) {
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw new BadRequestException(`${name} 的手動欄位必須是物件`);
      }
      const clean: Partial<ManualWageFields> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (!MANUAL_KEYS.includes(key as keyof ManualWageFields)) {
          throw new BadRequestException(`${name} 的手動欄位 ${key} 不存在`);
        }
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new BadRequestException(`${name} 的手動欄位 ${key} 必須是數字`);
        }
        clean[key as keyof ManualWageFields] = value;
      }
      result[name] = clean;
    }
    return result;
  }

  private toPreview(result: PayrollResult): PayrollPreview {
    return {
      period: result.period,
      variant: result.variant,
      source: this.loader.source,
      warnings: result.warnings,
      departments: result.departments.map((department) => ({
        department: department.department,
        hourSheetNames: department.hourSheetNames,
        wageSheetNames: department.wageSheetNames,
        days: department.days,
        summaries: department.summaries.map(toSummaryView),
        wages: department.wages,
      })),
    };
  }

  private buildWorkbook(run: PayrollRun, staff: WorkbookStaffRow[], days: WorkbookDayRow[]): Promise<Buffer> {
    return buildPayrollWorkbookBuffer({
      period: { start: run.periodStart, end: run.periodEnd },
      variant: run.variant,
      department: run.department,
      staff,
      days,
    });
  }

  private async writeWorkbook(
    run: PayrollRun,
    staff: WorkbookStaffRow[],
    days: WorkbookDayRow[],
  ): Promise<{ filePath: string; fileSha256: string }> {
    const fileName = payrollFileName({ start: run.periodStart, end: run.periodEnd }, run.variant, run.id);
    const buffer = await this.buildWorkbook(run, staff, days);
    return this.files.write(this.files.resolve(run.periodStart, fileName), buffer);
  }

  private withoutInput(run: PayrollRun): PayrollRun {
    const { inputJson: _omit, staff: _staff, days: _days, ...rest } = run;
    return rest as PayrollRun;
  }
}
