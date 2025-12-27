import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffSegment } from './entities/staff-segment.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export interface CreateStaffSegmentDto {
  staffId: string;
  begain_time: string;
  end_time: string;
  cross_day?: boolean;
  duty?: boolean;
  night_work?: boolean;
  rest_time?: number;
  rest_time2?: number;
}

export interface UpdateStaffSegmentDto {
  staffId?: string;
  begain_time?: string;
  end_time?: string;
  cross_day?: boolean;
  duty?: boolean;
  night_work?: boolean;
  rest_time?: number;
  rest_time2?: number;
}

@Injectable()
export class StaffSegmentService {
  constructor(
    @InjectRepository(StaffSegment)
    private readonly staffSegmentRepository: Repository<StaffSegment>,
  ) {}

  async create(
    createStaffSegmentDto: CreateStaffSegmentDto,
  ): Promise<StaffSegment> {
    const staffSegment = this.staffSegmentRepository.create(
      createStaffSegmentDto,
    );
    const savedStaffSegment =
      await this.staffSegmentRepository.save(staffSegment);
    return Array.isArray(savedStaffSegment)
      ? (savedStaffSegment[0] as StaffSegment)
      : savedStaffSegment;
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffSegment[] | PaginatedResponseDto<StaffSegment>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.staffSegmentRepository.findAndCount({
      relations: ['staff'],
      order: { id: 'ASC' } as any,
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findOne(id: number): Promise<StaffSegment> {
    const staffSegment = await this.staffSegmentRepository.findOne({
      where: { id } as any,
      relations: ['staff'],
    });

    if (!staffSegment) {
      throw new NotFoundException(`員工段別設定 ID ${id} 不存在`);
    }

    return staffSegment;
  }

  async findByStaffId(staffId: string): Promise<StaffSegment[]> {
    return await this.staffSegmentRepository.find({
      where: { staffId } as any,
      relations: ['staff'],
      order: { id: 'ASC' } as any,
    });
  }

  async update(
    id: number,
    updateStaffSegmentDto: UpdateStaffSegmentDto,
  ): Promise<StaffSegment> {
    const existingStaffSegment = await this.findOne(id);

    const updatedStaffSegment = this.staffSegmentRepository.merge(
      existingStaffSegment,
      updateStaffSegmentDto,
    );

    const savedStaffSegment =
      await this.staffSegmentRepository.save(updatedStaffSegment);
    return Array.isArray(savedStaffSegment)
      ? (savedStaffSegment[0] as StaffSegment)
      : savedStaffSegment;
  }

  async remove(id: number): Promise<void> {
    const staffSegment = await this.findOne(id);
    await this.staffSegmentRepository.remove(staffSegment);
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StaffSegment[]> {
    return await this.staffSegmentRepository
      .createQueryBuilder('staffSegment')
      .leftJoinAndSelect('staffSegment.staff', 'staff')
      .where('staffSegment.create_date >= :startDate', { startDate })
      .andWhere('staffSegment.create_date <= :endDate', { endDate })
      .orderBy('staffSegment.id', 'ASC')
      .getMany();
  }
}
