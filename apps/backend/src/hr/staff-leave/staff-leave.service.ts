import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffLeave } from './entities/staff-leave.entity';
import { User } from '../../auth/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PayrollService } from '../payroll/payroll.service';
import {
  anniversaryPeriod,
  calculateLeaveHours,
  segmentDefaultSpan,
  splitLeaveByDay,
} from '../payroll/domain/leave-hours';
import { dateToTaipeiWallClock, taipeiWallClockToDate } from '../taipei-time';
import { LeaveSegment, LeaveStaff, NewStaffLeave, STAFF_LEAVE_STORE, StaffLeaveStore } from './staff-leave.store';
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
  segment: LeaveSegment | null;
}

/**
 * 請假登錄。規則移植自 Java `Dialog_Leave`（規劃文件 1.5／3.5）：
 * 時數 30 分鐘捨去再扣休息、跨日拆單、`verify` 取登入者的員工姓名、
 * 已定稿薪資 run 涵蓋期間內不可增刪改。
 *
 * 請假、員工、段別資料經 `StaffLeaveStore` 存取；第七階段前綁定 MariaDB 實作，
 * 讓 Nest 登錄的請假直接進入 Java 與薪資計算共用的舊庫。登入者（`verify`）仍查 PostgreSQL。
 */
@Injectable()
export class StaffLeaveService {
  constructor(
    @Inject(STAFF_LEAVE_STORE) private readonly store: StaffLeaveStore,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly payroll: PayrollService,
  ) {}

  async findAll(page?: number, limit?: number): Promise<PaginatedResponseDto<StaffLeave>> {
    const pageNum = page ?? 1;
    const maxLimit = Math.min(limit ?? 50, 100);
    const { data, total } = await this.store.findPage(pageNum, maxLimit);
    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffLeave> {
    const leave = await this.store.findOne(id);
    if (!leave) throw new NotFoundException(`ID ${id} 的請假記錄不存在`);
    return leave;
  }

  async findByStaffId(staffId: string): Promise<StaffLeave[]> {
    const staff = await this.store.findStaffById(staffId);
    return staff ? this.findByStaffName(staff.name) : [];
  }

  findByStaffName(name: string): Promise<StaffLeave[]> {
    return this.store.findByName(name);
  }

  findByType(type: string): Promise<StaffLeave[]> {
    return this.store.findByType(type);
  }

  /** 期間內（依開始時間，台北日期）的請假，可依員工篩選。 */
  findInRange(query: LeaveRangeQueryDto): Promise<StaffLeave[]> {
    if (query.start > query.end) throw new BadRequestException('start 不可晚於 end');
    return this.store.findStartingBetween(
      taipeiWallClockToDate(`${query.start} 00:00:00`),
      taipeiWallClockToDate(`${query.end} 23:59:59`),
      query.name,
    );
  }

  /** 舊 API 相容：以 Date 範圍查詢。 */
  findByDateRange(startDate: Date, endDate: Date): Promise<StaffLeave[]> {
    return this.store.findWithin(startDate, endDate);
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

    const rows: NewStaffLeave[] = [];
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
    return this.store.insertMany(rows);
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
    return this.store.update(leave);
  }

  async remove(id: number): Promise<void> {
    const leave = await this.findOne(id);
    await this.assertNotFinalized(dateToTaipeiWallClock(leave.start_time).slice(0, 10));
    await this.store.delete(id);
  }

  /** 特休依到職日週年區間、病假依曆年加總已用時數。 */
  async balance(query: LeaveBalanceQueryDto): Promise<LeaveBalance> {
    const staff = await this.requireStaff(query.name);
    const date = query.date ?? dateToTaipeiWallClock(new Date()).slice(0, 10);
    const period = anniversaryPeriod(staff.begain_work, date);
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

  private sumHours(name: string, type: string, start: string, end: string): Promise<number> {
    return this.store.sumHours(
      name,
      type,
      taipeiWallClockToDate(`${start} 00:00:00`),
      taipeiWallClockToDate(`${end} 23:59:59`),
    );
  }

  private async hoursFor(name: string, start: string, end: string): Promise<number> {
    const segment = await this.latestSegment(name, start.slice(0, 10));
    if (!segment) throw new BadRequestException(`${name} 在 ${start.slice(0, 10)} 沒有段別設定，無法計算時數`);
    return calculateLeaveHours(start, end, { rest_time: segment.rest_time, rest_time2: segment.rest_time2 });
  }

  private latestSegment(name: string, date: string): Promise<LeaveSegment | null> {
    return this.store.latestSegment(name, date);
  }

  private async requireStaff(name: string): Promise<LeaveStaff> {
    const staff = await this.store.findStaffByName(name);
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
