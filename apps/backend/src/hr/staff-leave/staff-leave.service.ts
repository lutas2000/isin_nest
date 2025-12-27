import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffLeave } from './entities/staff-leave.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class StaffLeaveService {
  constructor(
    @InjectRepository(StaffLeave)
    private readonly staffLeaveRepository: Repository<StaffLeave>,
  ) {}

  // 獲取所有請假記錄
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffLeave[] | PaginatedResponseDto<StaffLeave>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.staffLeaveRepository.findAndCount({
      relations: ['staff', 'verifyByStaff'],
      order: { id: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  // 根據 ID 獲取單一請假記錄
  async findOne(id: number): Promise<StaffLeave> {
    const staffLeave = await this.staffLeaveRepository.findOne({
      where: { id },
      relations: ['staff', 'verifyByStaff'],
    });

    if (!staffLeave) {
      throw new NotFoundException(`ID ${id} 的請假記錄不存在`);
    }

    return staffLeave;
  }

  // 根據員工 ID 獲取請假記錄
  async findByStaffId(staffId: string): Promise<StaffLeave[]> {
    return await this.staffLeaveRepository.find({
      where: { staff_id: staffId },
      relations: ['staff', 'verifyByStaff'],
      order: { start_time: 'DESC' },
    });
  }

  // 根據員工姓名獲取請假記錄
  async findByStaffName(name: string): Promise<StaffLeave[]> {
    return await this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .leftJoinAndSelect('staffLeave.staff', 'staff')
      .leftJoinAndSelect('staffLeave.verifyByStaff', 'verifyByStaff')
      .where('staff.name LIKE :name', { name: `%${name}%` })
      .orderBy('staffLeave.start_time', 'DESC')
      .getMany();
  }

  // 建立新的請假記錄
  async create(createStaffLeaveDto: Partial<StaffLeave>): Promise<StaffLeave> {
    const staffLeave = this.staffLeaveRepository.create(createStaffLeaveDto);
    return await this.staffLeaveRepository.save(staffLeave);
  }

  // 更新請假記錄
  async update(
    id: number,
    updateStaffLeaveDto: Partial<StaffLeave>,
  ): Promise<StaffLeave> {
    const staffLeave = await this.findOne(id); // 會自動檢查是否存在

    // 更新資料
    Object.assign(staffLeave, updateStaffLeaveDto);

    return await this.staffLeaveRepository.save(staffLeave);
  }

  // 刪除請假記錄
  async remove(id: number): Promise<void> {
    const staffLeave = await this.findOne(id); // 會自動檢查是否存在

    await this.staffLeaveRepository.remove(staffLeave);
  }

  // 根據請假類型獲取記錄
  async findByType(type: string): Promise<StaffLeave[]> {
    return await this.staffLeaveRepository.find({
      where: { type },
      relations: ['staff', 'verifyByStaff'],
      order: { start_time: 'DESC' },
    });
  }

  // 根據日期範圍獲取請假記錄
  async findByDateRange(startDate: Date, endDate: Date): Promise<StaffLeave[]> {
    return await this.staffLeaveRepository
      .createQueryBuilder('staffLeave')
      .leftJoinAndSelect('staffLeave.staff', 'staff')
      .leftJoinAndSelect('staffLeave.verifyByStaff', 'verifyByStaff')
      .where('staffLeave.start_time >= :startDate', { startDate })
      .andWhere('staffLeave.end_time <= :endDate', { endDate })
      .orderBy('staffLeave.start_time', 'DESC')
      .getMany();
  }
}
