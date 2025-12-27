import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffVacation } from './entities/staff-vacation.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export interface CreateStaffVacationDto {
  date: Date | string;
  pay: boolean;
  type: string;
}

export interface UpdateStaffVacationDto {
  pay?: boolean;
  type?: string;
}

@Injectable()
export class StaffVacationService {
  constructor(
    @InjectRepository(StaffVacation)
    private readonly staffVacationRepository: Repository<StaffVacation>,
  ) {}

  async create(
    createStaffVacationDto: CreateStaffVacationDto,
  ): Promise<StaffVacation> {
    const staffVacation = this.staffVacationRepository.create(
      createStaffVacationDto,
    );
    return await this.staffVacationRepository.save(staffVacation);
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffVacation[] | PaginatedResponseDto<StaffVacation>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.staffVacationRepository.findAndCount({
      order: { date: 'DESC' } as any,
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(date: Date | string): Promise<StaffVacation> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const staffVacation = await this.staffVacationRepository.findOne({
      where: { date: dateObj } as any,
    });

    if (!staffVacation) {
      throw new NotFoundException(
        `日期 ${dateObj.toISOString().split('T')[0]} 的假期記錄不存在`,
      );
    }

    return staffVacation;
  }

  async update(
    date: Date | string,
    updateStaffVacationDto: UpdateStaffVacationDto,
  ): Promise<StaffVacation> {
    const existingStaffVacation = await this.findOne(date);

    const updatedStaffVacation = this.staffVacationRepository.merge(
      existingStaffVacation,
      updateStaffVacationDto,
    );

    return await this.staffVacationRepository.save(updatedStaffVacation);
  }

  async remove(date: Date | string): Promise<void> {
    const staffVacation = await this.findOne(date);
    await this.staffVacationRepository.remove(staffVacation);
  }

  async findByDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<StaffVacation[]> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    return await this.staffVacationRepository
      .createQueryBuilder('staffVacation')
      .where('staffVacation.date >= :startDate', { startDate: start })
      .andWhere('staffVacation.date <= :endDate', { endDate: end })
      .orderBy('staffVacation.date', 'ASC')
      .getMany();
  }

  async findByType(type: string): Promise<StaffVacation[]> {
    return await this.staffVacationRepository.find({
      where: { type } as any,
      order: { date: 'ASC' } as any,
    });
  }

  async findByPay(pay: boolean): Promise<StaffVacation[]> {
    return await this.staffVacationRepository.find({
      where: { pay } as any,
      order: { date: 'ASC' } as any,
    });
  }
}

