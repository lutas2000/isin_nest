import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { StaffLeave } from './entities/staff-leave.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { User } from '../../auth/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PayrollService } from '../payroll/payroll.service';
import {
  anniversaryPeriod,
  calculateLeaveHours,
  segmentDefaultSpan,
  splitLeaveByDay,
} from '../payroll/domain/leave-hours';
import { dateToTaipeiWallClock, taipeiWallClockToDate, toTaipeiDateString } from '../taipei-time';
import {
  CreateStaffLeaveDto,
  LeaveBalanceQueryDto,
  LeaveRangeQueryDto,
  UpdateStaffLeaveDto,
} from './dto/staff-leave.dto';

export interface LeaveBalance {
  name: string;
  annualLeave: { periodStart: string; periodEnd: string; usedHours: number };
  sickLeave: { year: number; usedHours: number };
}

export interface LeaveDefaults {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  segment: StaffSegment | null;
}

/**
 * 請假登錄。規則移植自 Java `Dialog_Leave`（規劃文件 1.5／3.5）：
 * 時數 30 分鐘捨去再扣休息、跨日拆單、`verify` 取登入者的員工姓名、
 * 已定稿薪資 run 涵蓋期間內不可增刪改。
 */
@Injectable()
export class StaffLeaveService {
  constructor(
    @InjectRepository(StaffLeave) private readonly leaves: Repository<StaffLeave>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(StaffSegment) private readonly segments: Repository<StaffSegment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly payroll: PayrollService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(page?: number, limit?: number): Promise<PaginatedResponseDto<StaffLeave>> {
    const pageNum = page ?? 1;
    const maxLimit = Math.min(limit ?? 50, 100);
    const [data, total] = await this.leaves.findAndCount({
      order: { start_time: 'DESC', id: 'DESC' },
      take: maxLimit,
      skip: (pageNum - 1) * maxLimit,
    });
    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffLeave> {
    const leave = await this.leaves.findOne({ where: { id } });
    if (!leave) throw new NotFoundException(`ID ${id} 的請假記錄不存在`);
    return leave;
  }

  async findByStaffId(staffId: string): Promise<StaffLeave[]> {
    const staff = await this.staff.findOne({ where: { id: staffId } });
    return staff ? this.findByStaffName(staff.name) : [];
  }

  findByStaffName(name: string): Promise<StaffLeave[]> {
    return this.leaves.find({ where: { name }, order: { start_time: 'DESC' } });
  }

  findByType(type: string): Promise<StaffLeave[]> {
    return this.leaves.find({ where: { type }, order: { start_time: 'DESC' } });
  }

  /** 期間內（依開始時間，台北日期）的請假，可依員工篩選。 */
  findInRange(query: LeaveRangeQueryDto): Promise<StaffLeave[]> {
    if (query.start > query.end) throw new BadRequestException('start 不可晚於 end');
    return this.leaves.find({
      where: {
        start_time: Between(
          taipeiWallClockToDate(`${query.start} 00:00:00`),
          taipeiWallClockToDate(`${query.end} 23:59:59`),
        ),
        ...(query.name ? { name: query.name } : {}),
      },
      order: { start_time: 'ASC', id: 'ASC' },
    });
  }

  /** 舊 API 相容：以 Date 範圍查詢。 */
  findByDateRange(startDate: Date, endDate: Date): Promise<StaffLeave[]> {
    return this.leaves
      .createQueryBuilder('leave')
      .where('leave.start_time >= :startDate', { startDate })
      .andWhere('leave.end_time <= :endDate', { endDate })
      .orderBy('leave.start_time', 'DESC')
      .getMany();
  }

  /** 員工當日的預設請假時段：最新段別的上下班時間。 */
  async defaults(name: string, date: string): Promise<LeaveDefaults> {
    await this.requireStaff(name);
    const segment = await this.latestSegment(name, date);
    if (!segment) return { name, date, start_time: `${date} 08:00:00`, end_time: `${date} 17:00:00`, segment: null };
    const span = segmentDefaultSpan(date, {
      begain_time: segment.begain_time,
      end_time: segment.end_time,
      cross_day: Boolean(segment.cross_day),
    });
    return { name, date, ...span, segment };
  }

  /** 建立請假；跨日拆成每天一筆，同一交易寫入，回傳全部建立的紀錄。 */
  async create(dto: CreateStaffLeaveDto, userId: number | null): Promise<StaffLeave[]> {
    const start = normalize(dto.start_time);
    const end = normalize(dto.end_time);
    if (start >= end) throw new BadRequestException('結束時間必須晚於開始時間');
    await this.requireStaff(dto.name);
    const verify = await this.verifierName(userId);

    const rows: Partial<StaffLeave>[] = [];
    for (const span of splitLeaveByDay(start, end)) {
      await this.assertNotFinalized(span.start_time.slice(0, 10));
      const time = await this.hoursFor(dto.name, span.start_time, span.end_time);
      rows.push({
        name: dto.name,
        type: dto.type,
        start_time: taipeiWallClockToDate(span.start_time),
        end_time: taipeiWallClockToDate(span.end_time),
        time,
        verify,
      });
    }
    return this.dataSource.transaction((manager) => manager.save(StaffLeave, rows));
  }

  async update(id: number, dto: UpdateStaffLeaveDto, userId: number | null): Promise<StaffLeave> {
    const leave = await this.findOne(id);
    const start = dto.start_time ? normalize(dto.start_time) : dateToTaipeiWallClock(leave.start_time);
    const end = dto.end_time ? normalize(dto.end_time) : dateToTaipeiWallClock(leave.end_time);
    if (start >= end) throw new BadRequestException('結束時間必須晚於開始時間');
    if (start.slice(0, 10) !== end.slice(0, 10)) {
      throw new BadRequestException('修改時不可跨日；請刪除後重新登錄');
    }
    await this.assertNotFinalized(dateToTaipeiWallClock(leave.start_time).slice(0, 10));
    await this.assertNotFinalized(start.slice(0, 10));

    leave.type = dto.type ?? leave.type;
    leave.start_time = taipeiWallClockToDate(start);
    leave.end_time = taipeiWallClockToDate(end);
    leave.time = await this.hoursFor(leave.name, start, end);
    leave.verify = await this.verifierName(userId);
    return this.leaves.save(leave);
  }

  async remove(id: number): Promise<void> {
    const leave = await this.findOne(id);
    await this.assertNotFinalized(dateToTaipeiWallClock(leave.start_time).slice(0, 10));
    await this.leaves.remove(leave);
  }

  /** 特休依到職日週年區間、病假依曆年加總已用時數。 */
  async balance(query: LeaveBalanceQueryDto): Promise<LeaveBalance> {
    const staff = await this.requireStaff(query.name);
    const date = query.date ?? dateToTaipeiWallClock(new Date()).slice(0, 10);
    const period = anniversaryPeriod(toTaipeiDateString(staff.begain_work), date);
    const year = Number(date.slice(0, 4));
    const [annual, sick] = await Promise.all([
      this.sumHours(query.name, '特休', period.start, period.end),
      this.sumHours(query.name, '病假', `${year}-01-01`, `${year}-12-31`),
    ]);
    return {
      name: query.name,
      annualLeave: { periodStart: period.start, periodEnd: period.end, usedHours: annual },
      sickLeave: { year, usedHours: sick },
    };
  }

  private async sumHours(name: string, type: string, start: string, end: string): Promise<number> {
    const row = await this.leaves
      .createQueryBuilder('leave')
      .select('COALESCE(SUM(leave.time), 0)', 'total')
      .where('leave.name = :name AND leave.type = :type', { name, type })
      .andWhere('leave.start_time BETWEEN :start AND :end', {
        start: taipeiWallClockToDate(`${start} 00:00:00`),
        end: taipeiWallClockToDate(`${end} 23:59:59`),
      })
      .getRawOne<{ total: string }>();
    return Number(row?.total ?? 0);
  }

  private async hoursFor(name: string, start: string, end: string): Promise<number> {
    const segment = await this.latestSegment(name, start.slice(0, 10));
    if (!segment) throw new BadRequestException(`${name} 在 ${start.slice(0, 10)} 沒有段別設定，無法計算時數`);
    return calculateLeaveHours(start, end, { rest_time: segment.rest_time, rest_time2: segment.rest_time2 });
  }

  /** 當日生效段別：create_date ≤ 當日的最新一筆（與薪資計算的 pickDaySegment 相同）。 */
  private latestSegment(name: string, date: string): Promise<StaffSegment | null> {
    return this.segments
      .createQueryBuilder('segment')
      .where('segment.name = :name', { name })
      .andWhere('segment.create_date <= :date', { date })
      .orderBy('segment.create_date', 'DESC')
      .addOrderBy('segment.id', 'DESC')
      .getOne();
  }

  private async requireStaff(name: string): Promise<Staff> {
    const staff = await this.staff.findOne({ where: { name } });
    if (!staff) throw new BadRequestException(`找不到員工 ${name}`);
    return staff;
  }

  /** `verify` 寫入登入者對應的員工姓名；沒有關聯員工時用帳號名稱。 */
  private async verifierName(userId: number | null): Promise<string> {
    if (userId === null) return '';
    const user = await this.users.findOne({ where: { id: userId }, relations: ['staff'] });
    return (user?.staff?.name ?? user?.userName ?? '').slice(0, 6);
  }

  private async assertNotFinalized(date: string): Promise<void> {
    if (await this.payroll.hasFinalRunCovering(date)) {
      throw new ConflictException(`${date} 已在定稿的薪資期間內，不可修改請假`);
    }
  }
}

function normalize(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}
