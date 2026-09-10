import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Staff } from '../staff/entities/staff.entity';
import { SchedulePicker } from '../working-hours/schedule-picker';
import { CreateStaffLeaveDto } from './dto/create-staff-leave.dto';
import { StaffLeave, LeaveStatus } from './entities/staff-leave.entity';

type StaffLeaveInput = CreateStaffLeaveDto | Partial<StaffLeave>;

@Injectable()
export class StaffLeaveService {
  constructor(
    @InjectRepository(StaffLeave)
    private readonly staffLeaveRepository: Repository<StaffLeave>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly schedulePicker: SchedulePicker,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    status?: LeaveStatus,
  ): Promise<PaginatedResponseDto<StaffLeave>> {
    const pageNum = Math.max(Number(page) || 1, 1);
    const maxLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where = status ? { status } : undefined;
    const [data, total] = await this.staffLeaveRepository.findAndCount({
      where,
      relations: ['staff', 'verifyByStaff'],
      order: { start_time: 'DESC', id: 'DESC' } as any,
      take: maxLimit,
      skip: (pageNum - 1) * maxLimit,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffLeave> {
    const staffLeave = await this.staffLeaveRepository.findOne({
      where: { id },
      relations: ['staff', 'verifyByStaff'],
    });

    if (!staffLeave) {
      throw new NotFoundException(`ID ${id} 的請假記錄不存在`);
    }

    // migration 前建立的資料視同待審核，避免舊資料無法操作。
    staffLeave.status ??= LeaveStatus.PENDING;
    return staffLeave;
  }

  async findByStaffId(staffId: string): Promise<StaffLeave[]> {
    return this.staffLeaveRepository.find({
      where: { staff_id: staffId },
      relations: ['staff', 'verifyByStaff'],
      order: { start_time: 'DESC' } as any,
    });
  }

  async findByStaffName(name: string): Promise<StaffLeave[]> {
    return this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .leftJoinAndSelect('staffLeave.staff', 'staff')
      .leftJoinAndSelect('staffLeave.verifyByStaff', 'verifyByStaff')
      .where('staff.name LIKE :name', { name: `%${name}%` })
      .orderBy('staffLeave.start_time', 'DESC')
      .getMany();
  }

  async create(
    input: StaffLeaveInput,
    _requesterStaffId?: string,
  ): Promise<StaffLeave> {
    const staffId = String(input.staff_id || '').trim();
    const staff = await this.requireStaff(staffId);
    const startTime = this.toDate(input.start_time, '開始時間');
    const endTime = this.toDate(input.end_time, '結束時間');
    this.ensurePositiveInterval(startTime, endTime);

    const leave = this.staffLeaveRepository.create({
      staff_id: staff.id,
      type: String(input.type || '').trim(),
      start_time: startTime,
      end_time: endTime,
      time: await this.calculateLeaveTime(staff.id, startTime, endTime),
      status: LeaveStatus.PENDING,
      verify_by_staff_id: null,
      verify_note: undefined,
    } as Partial<StaffLeave>);

    const saved = await this.staffLeaveRepository.save(leave);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(
    id: number,
    input: StaffLeaveInput,
  ): Promise<StaffLeave> {
    const existing = await this.findOne(id);
    this.ensurePending(existing);

    const staffId = String(input.staff_id || existing.staff_id).trim();
    const staff = await this.requireStaff(staffId);
    const startTime = this.toDate(
      input.start_time ?? existing.start_time,
      '開始時間',
    );
    const endTime = this.toDate(input.end_time ?? existing.end_time, '結束時間');
    this.ensurePositiveInterval(startTime, endTime);

    existing.staff_id = staff.id;
    existing.type = String(input.type ?? existing.type).trim();
    existing.start_time = startTime;
    existing.end_time = endTime;
    existing.time = await this.calculateLeaveTime(staff.id, startTime, endTime);

    const saved = await this.staffLeaveRepository.save(existing);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async remove(id: number): Promise<void> {
    const staffLeave = await this.findOne(id);
    this.ensurePending(staffLeave);
    await this.staffLeaveRepository.remove(staffLeave);
  }

  async approve(
    id: number,
    verifierStaffId: string,
    note?: string,
  ): Promise<StaffLeave> {
    return this.review(id, verifierStaffId, LeaveStatus.APPROVED, note);
  }

  async reject(
    id: number,
    verifierStaffId: string,
    note?: string,
  ): Promise<StaffLeave> {
    return this.review(id, verifierStaffId, LeaveStatus.REJECTED, note);
  }

  async findByType(type: string): Promise<StaffLeave[]> {
    return this.staffLeaveRepository.find({
      where: { type },
      relations: ['staff', 'verifyByStaff'],
      order: { start_time: 'DESC' } as any,
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<StaffLeave[]> {
    const inclusiveEndDate = this.endOfDateIfDateOnly(endDate);
    return this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .leftJoinAndSelect('staffLeave.staff', 'staff')
      .leftJoinAndSelect('staffLeave.verifyByStaff', 'verifyByStaff')
      .where('staffLeave.start_time <= :endDate', {
        endDate: inclusiveEndDate,
      })
      .andWhere('staffLeave.end_time > :startDate', { startDate })
      .orderBy('staffLeave.start_time', 'DESC')
      .getMany();
  }

  /** 供每日工時彙總重用的已核准請假時數。 */
  async findApprovedByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StaffLeave[]> {
    return this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .leftJoinAndSelect('staffLeave.staff', 'staff')
      .where('staffLeave.status = :status', { status: LeaveStatus.APPROVED })
      .andWhere('staffLeave.start_time < :endDate', { endDate })
      .andWhere('staffLeave.end_time > :startDate', { startDate })
      .orderBy('staffLeave.start_time', 'ASC')
      .getMany();
  }

  async calculateLeaveTime(
    staffId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<number> {
    const durationHours = (endTime.getTime() - startTime.getTime()) / 3600000;
    await this.schedulePicker.initialize(staffId, startTime);

    let breakHours = 0;
    if (this.schedulePicker.hasValidSegment()) {
      breakHours = this.schedulePicker.getBreakHour(startTime, endTime);
    } else if (durationHours >= 6) {
      // 與 WorkingHoursService 的無段別 fallback 一致，但短時數請假不扣整小時。
      breakHours = 1;
    }

    return Number(Math.max(0, durationHours - breakHours).toFixed(2));
  }

  private async review(
    id: number,
    verifierStaffId: string,
    status: LeaveStatus,
    note?: string,
  ): Promise<StaffLeave> {
    const verifierId = String(verifierStaffId || '').trim();
    await this.requireStaff(verifierId);
    const leave = await this.findOne(id);
    this.ensurePending(leave);

    leave.status = status;
    leave.verify_by_staff_id = verifierId;
    leave.verify_note = note?.trim() || undefined;

    const saved = await this.staffLeaveRepository.save(leave);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  private async requireStaff(staffId: string): Promise<Staff> {
    if (!staffId) throw new BadRequestException('員工 ID 為必填');

    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });
    if (!staff) throw new NotFoundException(`員工 ${staffId} 不存在`);
    return staff;
  }

  private toDate(value: Date | string | undefined, label: string): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value || '');
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label}格式無效`);
    }
    return date;
  }

  private ensurePositiveInterval(startTime: Date, endTime: Date): void {
    if (endTime <= startTime) {
      throw new BadRequestException('結束時間必須晚於開始時間');
    }
  }

  private ensurePending(leave: StaffLeave): void {
    if ((leave.status || LeaveStatus.PENDING) !== LeaveStatus.PENDING) {
      throw new BadRequestException('只有待審核的請假記錄可以修改或審核');
    }
  }

  private endOfDateIfDateOnly(date: Date): Date {
    const result = new Date(date);
    if (
      result.getUTCHours() === 0 &&
      result.getUTCMinutes() === 0 &&
      result.getUTCSeconds() === 0 &&
      result.getUTCMilliseconds() === 0
    ) {
      result.setUTCHours(23, 59, 59, 999);
    }
    return result;
  }
}
