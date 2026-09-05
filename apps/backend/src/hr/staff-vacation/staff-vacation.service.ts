import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffVacation } from './entities/staff-vacation.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export interface CreateStaffVacationDto {
  date: Date | string;
  pay: number;
}

export interface UpdateStaffVacationDto {
  pay?: number;
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
    return this.staffVacationRepository.save(staffVacation);
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffVacation[] | PaginatedResponseDto<StaffVacation>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.staffVacationRepository.findAndCount({
      order: { date: 'DESC' },
      take: limitNum,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  async findOne(date: Date | string): Promise<StaffVacation> {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const staffVacation = await this.staffVacationRepository.findOne({
      where: { date: dateObj },
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
    const existing = await this.findOne(date);
    const updated = this.staffVacationRepository.merge(
      existing,
      updateStaffVacationDto,
    );
    return this.staffVacationRepository.save(updated);
  }

  async remove(date: Date | string): Promise<void> {
    const staffVacation = await this.findOne(date);
    await this.staffVacationRepository.remove(staffVacation);
  }

  async findByDateRange(
    startDate: Date | string,
    endDate: Date | string,
  ): Promise<StaffVacation[]> {
    const start =
      typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    return this.staffVacationRepository
      .createQueryBuilder('staffVacation')
      .where('staffVacation.date >= :startDate', { startDate: start })
      .andWhere('staffVacation.date <= :endDate', { endDate: end })
      .orderBy('staffVacation.date', 'ASC')
      .getMany();
  }

  async findByPay(pay: number): Promise<StaffVacation[]> {
    return this.staffVacationRepository.find({
      where: { pay },
      order: { date: 'ASC' },
    });
  }
}
