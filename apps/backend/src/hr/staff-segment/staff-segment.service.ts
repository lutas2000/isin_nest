import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffSegment } from './entities/staff-segment.entity';
import { Staff } from '../staff/entities/staff.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export interface CreateStaffSegmentDto {
  name: string;
  begain_time: string;
  end_time: string;
  cross_day?: number;
  duty?: number;
  night_work?: number;
  rest_time?: number;
  rest_time2?: number;
  create_date?: Date;
}

export interface UpdateStaffSegmentDto {
  name?: string;
  begain_time?: string;
  end_time?: string;
  cross_day?: number;
  duty?: number;
  night_work?: number;
  rest_time?: number;
  rest_time2?: number;
}

@Injectable()
export class StaffSegmentService {
  constructor(
    @InjectRepository(StaffSegment)
    private readonly staffSegmentRepository: Repository<StaffSegment>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  async create(
    createStaffSegmentDto: CreateStaffSegmentDto,
  ): Promise<StaffSegment> {
    const staffSegment = this.staffSegmentRepository.create({
      ...createStaffSegmentDto,
      create_date: createStaffSegmentDto.create_date ?? new Date(),
    });
    return this.staffSegmentRepository.save(staffSegment);
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffSegment[] | PaginatedResponseDto<StaffSegment>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.staffSegmentRepository.findAndCount({
      order: { id: 'ASC' },
      take: limitNum,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  async findOne(id: number): Promise<StaffSegment> {
    const staffSegment = await this.staffSegmentRepository.findOne({
      where: { id },
    });
    if (!staffSegment) {
      throw new NotFoundException(`員工段別設定 ID ${id} 不存在`);
    }
    return staffSegment;
  }

  async findByStaffId(staffId: string): Promise<StaffSegment[]> {
    const staff = await this.staffRepository.findOne({ where: { id: staffId } });
    if (!staff) return [];
    return this.findByName(staff.name);
  }

  async findByName(name: string): Promise<StaffSegment[]> {
    return this.staffSegmentRepository.find({
      where: { name },
      order: { id: 'ASC' },
    });
  }

  async update(
    id: number,
    updateStaffSegmentDto: UpdateStaffSegmentDto,
  ): Promise<StaffSegment> {
    const existing = await this.findOne(id);
    const updated = this.staffSegmentRepository.merge(
      existing,
      updateStaffSegmentDto,
    );
    return this.staffSegmentRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    const staffSegment = await this.findOne(id);
    await this.staffSegmentRepository.remove(staffSegment);
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StaffSegment[]> {
    return this.staffSegmentRepository
      .createQueryBuilder('staffSegment')
      .where('staffSegment.create_date >= :startDate', { startDate })
      .andWhere('staffSegment.create_date <= :endDate', { endDate })
      .orderBy('staffSegment.id', 'ASC')
      .getMany();
  }
}
