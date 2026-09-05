import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffLeave } from './entities/staff-leave.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { SchedulePicker } from '../working-hours/schedule-picker';

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
  ): Promise<StaffLeave[] | PaginatedResponseDto<StaffLeave>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.staffLeaveRepository.findAndCount({
      order: { id: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffLeave> {
    const staffLeave = await this.staffLeaveRepository.findOne({
      where: { id },
    });

    if (!staffLeave) {
      throw new NotFoundException(`ID ${id} 的請假記錄不存在`);
    }

    return staffLeave;
  }

  async findByStaffId(staffId: string): Promise<StaffLeave[]> {
    const staff = await this.staffRepository.findOne({ where: { id: staffId } });
    if (!staff) return [];
    return this.findByStaffName(staff.name);
  }

  async findByStaffName(name: string): Promise<StaffLeave[]> {
    return this.staffLeaveRepository.find({
      where: { name },
      order: { start_time: 'DESC' },
    });
  }

  async create(
    createStaffLeaveDto: Partial<StaffLeave>,
    verifyBy?: string,
  ): Promise<StaffLeave> {
    const dto = { ...createStaffLeaveDto };
    await this.applyLeaveTimeCalculation(dto, verifyBy);
    const staffLeave = this.staffLeaveRepository.create(dto);
    return this.staffLeaveRepository.save(staffLeave);
  }

  async update(
    id: number,
    updateStaffLeaveDto: Partial<StaffLeave>,
    verifyBy?: string,
  ): Promise<StaffLeave> {
    const staffLeave = await this.findOne(id);
    const dto = { ...updateStaffLeaveDto };
    await this.applyLeaveTimeCalculation(
      { ...staffLeave, ...dto },
      verifyBy,
    );
    Object.assign(staffLeave, dto);
    return this.staffLeaveRepository.save(staffLeave);
  }

  async remove(id: number): Promise<void> {
    const staffLeave = await this.findOne(id);
    await this.staffLeaveRepository.remove(staffLeave);
  }

  async findByType(type: string): Promise<StaffLeave[]> {
    return this.staffLeaveRepository.find({
      where: { type },
      order: { start_time: 'DESC' },
    });
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<StaffLeave[]> {
    return this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .where('staffLeave.start_time >= :startDate', { startDate })
      .andWhere('staffLeave.end_time <= :endDate', { endDate })
      .orderBy('staffLeave.start_time', 'DESC')
      .getMany();
  }

  private async applyLeaveTimeCalculation(
    dto: Partial<StaffLeave>,
    verifyBy?: string,
  ): Promise<void> {
    if (!dto.name || !dto.start_time || !dto.end_time) return;

    await this.schedulePicker.initialize(
      dto.name,
      new Date(dto.start_time),
    );
    const breakHour = this.schedulePicker.getBreakHour(
      new Date(dto.start_time),
      new Date(dto.end_time),
    );
    const leaveHour =
      (new Date(dto.end_time).getTime() - new Date(dto.start_time).getTime()) /
      (1000 * 60 * 60);
    dto.time = leaveHour - breakHour;
    if (verifyBy) {
      dto.verify = verifyBy.slice(0, 6);
    } else if (!dto.verify) {
      dto.verify = '';
    }
  }
}
