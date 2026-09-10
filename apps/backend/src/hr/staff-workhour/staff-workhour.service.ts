import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { StaffLeave, LeaveStatus } from '../staff-leave/entities/staff-leave.entity';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffWorkhour } from './entities/staff-workhour.entity';
import {
  calculatePayroll,
  calculateStaffWorkhour,
  PayrollReportItem,
} from './staff-workhour.calculator';

@Injectable()
export class StaffWorkhourService {
  constructor(
    @InjectRepository(StaffWorkhour)
    private readonly workhourRepository: Repository<StaffWorkhour>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(StaffManhour)
    private readonly manhourRepository: Repository<StaffManhour>,
    @InjectRepository(StaffLeave)
    private readonly leaveRepository: Repository<StaffLeave>,
    @InjectRepository(StaffSegment)
    private readonly segmentRepository: Repository<StaffSegment>,
  ) {}

  async findAll(
    page = 1,
    limit = 50,
    startDate?: Date,
    endDate?: Date,
    staffId?: string,
  ): Promise<PaginatedResponseDto<StaffWorkhour>> {
    const pageNum = Math.max(Number(page) || 1, 1);
    const maxLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where: Record<string, unknown> = {};
    if (startDate && endDate) {
      where.date = Between(this.toDateOnly(startDate), this.toDateOnly(endDate));
    }
    if (staffId) where.staffId = staffId;

    const [data, total] = await this.workhourRepository.findAndCount({
      where: where as any,
      relations: ['staff'],
      order: { date: 'DESC', staffId: 'ASC' } as any,
      take: maxLimit,
      skip: (pageNum - 1) * maxLimit,
    });
    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffWorkhour> {
    const workhour = await this.workhourRepository.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!workhour) throw new NotFoundException(`員工日工時 ${id} 不存在`);
    return workhour;
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    staffId?: string,
  ): Promise<StaffWorkhour[]> {
    const where: Record<string, unknown> = {
      date: Between(this.toDateOnly(startDate), this.toDateOnly(endDate)),
    };
    if (staffId) where.staffId = staffId;
    return this.workhourRepository.find({
      where: where as any,
      relations: ['staff'],
      order: { date: 'ASC', staffId: 'ASC' } as any,
    });
  }

  async calculate(date: Date, staffId?: string): Promise<StaffWorkhour[]> {
    const dateOnly = this.toDateOnly(date);
    const staffList = staffId
      ? [await this.requireStaff(staffId)]
      : await this.findActiveStaff(dateOnly);
    const result: StaffWorkhour[] = [];

    for (const staff of staffList) {
      const manhours = await this.manhourRepository.find({
        where: { staffId: staff.id, day: dateOnly } as any,
      });
      const leaves = await this.leaveRepository.find({
        where: {
          staff_id: staff.id,
          status: LeaveStatus.APPROVED,
        } as any,
      });
      const dayStart = new Date(dateOnly);
      const dayEnd = new Date(dateOnly);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const dayLeaves = leaves
        .filter(
          (leave) => leave.start_time < dayEnd && leave.end_time > dayStart,
        )
        .map((leave) => this.allocateLeaveToDay(leave, dayStart, dayEnd));
      const segment = await this.findSegment(staff.id, dateOnly);
      const calculated = calculateStaffWorkhour({
        staffId: staff.id,
        date: dateOnly,
        expectedStartTime: segment?.begain_time,
        standardHours: this.getStandardHours(segment),
        manhours,
        leaves: dayLeaves,
      });

      const existing = await this.workhourRepository.findOne({
        where: { staffId: staff.id, date: dateOnly } as any,
      });
      const workhour = existing
        ? this.workhourRepository.merge(existing, calculated)
        : this.workhourRepository.create(calculated);
      const saved = await this.workhourRepository.save(workhour);
      result.push(Array.isArray(saved) ? saved[0] : saved);
    }

    return result;
  }

  async calculateRange(startDate: Date, endDate: Date): Promise<StaffWorkhour[]> {
    const result: StaffWorkhour[] = [];
    const current = this.toDateOnly(startDate);
    const end = this.toDateOnly(endDate);
    while (current <= end) {
      result.push(...(await this.calculate(current)));
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return result;
  }

  async payroll(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    startDate: Date;
    endDate: Date;
    items: PayrollReportItem[];
    totals: { grossPay: number; deductions: number; netPay: number };
  }> {
    const start = this.toDateOnly(startDate);
    const end = this.toDateOnly(endDate);
    const [staffList, workhours] = await Promise.all([
      this.staffRepository.find(),
      this.workhourRepository.find({
        where: { date: Between(start, end) } as any,
        relations: ['staff'],
      }),
    ]);
    const aggregates = new Map<string, {
      work_time: number;
      leave_time: number;
      overtime: number;
      late: number;
    }>();

    for (const workhour of workhours) {
      const aggregate = aggregates.get(workhour.staffId) || {
        work_time: 0,
        leave_time: 0,
        overtime: 0,
        late: 0,
      };
      aggregate.work_time += workhour.work_time || 0;
      aggregate.leave_time += workhour.leave_time || 0;
      aggregate.overtime += workhour.overtime || 0;
      aggregate.late += workhour.late || 0;
      aggregates.set(workhour.staffId, aggregate);
    }

    const items = staffList.map((staff) =>
      calculatePayroll(
        staff,
        aggregates.get(staff.id) || {
          work_time: 0,
          leave_time: 0,
          overtime: 0,
          late: 0,
        },
      ),
    );
    const totals = items.reduce(
      (total, item) => ({
        grossPay: total.grossPay + item.grossPay,
        deductions: total.deductions + item.deductions,
        netPay: total.netPay + item.netPay,
      }),
      { grossPay: 0, deductions: 0, netPay: 0 },
    );

    return { startDate: start, endDate: end, items, totals };
  }

  async remove(id: number): Promise<void> {
    const workhour = await this.findOne(id);
    await this.workhourRepository.remove(workhour);
  }

  private async findActiveStaff(date: Date): Promise<Staff[]> {
    const staffList = await this.staffRepository.find({
      where: { need_check: true },
    });
    return staffList.filter(
      (staff) =>
        (!staff.begain_work || this.toDateOnly(staff.begain_work) <= date) &&
        (!staff.stop_work || this.toDateOnly(staff.stop_work) >= date),
    );
  }

  private async requireStaff(staffId: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({ where: { id: staffId } });
    if (!staff) throw new NotFoundException(`員工 ${staffId} 不存在`);
    return staff;
  }

  private findSegment(staffId: string, date: Date): Promise<StaffSegment | null> {
    return this.segmentRepository.findOne({
      where: {
        staffId,
        create_date: LessThanOrEqual(date),
      } as any,
      order: { create_date: 'DESC' } as any,
    });
  }

  private getStandardHours(segment?: StaffSegment | null): number {
    if (!segment) return 8;
    const [startHour, startMinute] = segment.begain_time.split(':').map(Number);
    const [endHour, endMinute] = segment.end_time.split(':').map(Number);
    let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (segment.cross_day || minutes < 0) minutes += 24 * 60;
    return Math.max(0, Number((minutes / 60 - (segment.rest_time || 0) / 60).toFixed(2)));
  }

  private allocateLeaveToDay(
    leave: StaffLeave,
    dayStart: Date,
    dayEnd: Date,
  ): StaffLeave {
    const leaveStart = Math.max(leave.start_time.getTime(), dayStart.getTime());
    const leaveEnd = Math.min(leave.end_time.getTime(), dayEnd.getTime());
    const duration = leave.end_time.getTime() - leave.start_time.getTime();
    const overlap = Math.max(0, leaveEnd - leaveStart);
    const ratio = duration > 0 ? overlap / duration : 0;

    return {
      ...leave,
      time: Number(((leave.time || 0) * ratio).toFixed(2)),
    };
  }

  private toDateOnly(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
