import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { StaffManhour } from './entities/staff-manhour.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PayrollService } from '../payroll/payroll.service';
import { dateToTaipeiWallClock, taipeiWallClockToDate } from '../taipei-time';
import { CopyManhourDto, CreateManhour2Dto, Manhour2QueryDto, UpdateManhour2Dto } from './dto/staff-manhour2.dto';

export interface CopyResult {
  copied: number;
  skipped: number;
  rows: StaffManhour2[];
}

/**
 * 外帳工時（staff_manhour2）維護。外帳薪資報表的 have_fake 員工讀這張表（規劃文件 3.7）。
 * 已定稿薪資 run 涵蓋期間內不可增刪改。
 */
@Injectable()
export class StaffManhour2Service {
  constructor(
    @InjectRepository(StaffManhour2) private readonly repository: Repository<StaffManhour2>,
    @InjectRepository(StaffManhour) private readonly manhours: Repository<StaffManhour>,
    private readonly payroll: PayrollService,
  ) {}

  async findAll(page?: number, limit?: number): Promise<PaginatedResponseDto<StaffManhour2>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const [data, total] = await this.repository.findAndCount({
      order: { id: 'DESC' },
      take: limitNum,
      skip: (pageNum - 1) * limitNum,
    });
    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  /** 依員工與期間（開始時間的台北日期）查詢，依開始時間排序。 */
  search(query: Manhour2QueryDto): Promise<StaffManhour2[]> {
    if (query.from && query.to && query.from > query.to) throw new BadRequestException('from 不可晚於 to');
    const where: Record<string, unknown> = {};
    if (query.name) where.name = query.name;
    if (query.from || query.to) {
      where.start_time = Between(
        taipeiWallClockToDate(`${query.from ?? '1970-01-01'} 00:00:00`),
        taipeiWallClockToDate(`${query.to ?? '2999-12-31'} 23:59:59`),
      );
    }
    return this.repository.find({ where, order: { start_time: 'ASC', id: 'ASC' } });
  }

  async findOne(id: number): Promise<StaffManhour2> {
    const row = await this.repository.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`ID ${id} 的外帳工時不存在`);
    return row;
  }

  findByName(name: string): Promise<StaffManhour2[]> {
    return this.repository.find({ where: { name }, order: { id: 'DESC' } });
  }

  async create(dto: CreateManhour2Dto): Promise<StaffManhour2> {
    const start = taipeiWallClockToDate(dto.start_time);
    const end = dto.end_time ? taipeiWallClockToDate(dto.end_time) : undefined;
    if (end && end <= start) throw new BadRequestException('結束時間必須晚於開始時間');
    await this.assertNotFinalized(start);
    return this.repository.save(
      this.repository.create({ name: dto.name, start_time: start, end_time: end, work_time: workHours(start, end) }),
    );
  }

  async update(id: number, dto: UpdateManhour2Dto): Promise<StaffManhour2> {
    const row = await this.findOne(id);
    if (row.start_time) await this.assertNotFinalized(row.start_time);
    const start = dto.start_time ? taipeiWallClockToDate(dto.start_time) : row.start_time;
    const end =
      dto.end_time === undefined ? row.end_time : dto.end_time === null ? undefined : taipeiWallClockToDate(dto.end_time);
    if (!start) throw new BadRequestException('缺少開始時間');
    if (end && end <= start) throw new BadRequestException('結束時間必須晚於開始時間');
    await this.assertNotFinalized(start);
    row.start_time = start;
    row.end_time = end;
    row.work_time = workHours(start, end);
    return this.repository.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    if (row.start_time) await this.assertNotFinalized(row.start_time);
    await this.repository.remove(row);
  }

  /** 把 staff_manhour 同期間的區間複製到 staff_manhour2；已有相同開始時間的列跳過，不覆寫。 */
  async copyFromManhour(dto: CopyManhourDto): Promise<CopyResult> {
    if (dto.from > dto.to) throw new BadRequestException('from 不可晚於 to');
    await this.assertNotFinalized(taipeiWallClockToDate(`${dto.from} 00:00:00`));
    await this.assertNotFinalized(taipeiWallClockToDate(`${dto.to} 00:00:00`));
    const range = Between(
      taipeiWallClockToDate(`${dto.from} 00:00:00`),
      taipeiWallClockToDate(`${dto.to} 23:59:59`),
    );
    const [source, existing] = await Promise.all([
      this.manhours.find({ where: { name: dto.name, start_time: range }, order: { start_time: 'ASC' } }),
      this.repository.find({ where: { name: dto.name, start_time: range } }),
    ]);
    const taken = new Set(existing.map((row) => row.start_time?.getTime()));
    const rows = source
      .filter((row) => row.start_time && !taken.has(row.start_time.getTime()))
      .map((row) =>
        this.repository.create({
          name: dto.name,
          start_time: row.start_time,
          end_time: row.end_time ?? undefined,
          work_time: workHours(row.start_time as Date, row.end_time ?? undefined),
        }),
      );
    const saved = rows.length ? await this.repository.save(rows) : [];
    return { copied: saved.length, skipped: source.length - saved.length, rows: saved };
  }

  private async assertNotFinalized(at: Date): Promise<void> {
    const date = dateToTaipeiWallClock(at).slice(0, 10);
    if (await this.payroll.hasFinalRunCovering(date)) {
      throw new ConflictException(`${date} 已在定稿的薪資期間內，不可修改外帳工時`);
    }
  }
}

/** 原始時數（小時，一位小數），只作顯示；薪資計算另依 HourPage 規則修整。 */
function workHours(start: Date, end?: Date): number {
  if (!end) return 0;
  return Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 10) / 10;
}
