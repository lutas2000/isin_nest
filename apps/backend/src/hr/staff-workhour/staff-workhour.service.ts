import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffWorkhour } from './entities/staff-workhour.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class StaffWorkhourService {
  constructor(
    @InjectRepository(StaffWorkhour)
    private readonly repository: Repository<StaffWorkhour>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffWorkhour[] | PaginatedResponseDto<StaffWorkhour>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const skip = (pageNum - 1) * limitNum;
    const [data, total] = await this.repository.findAndCount({
      order: { date: 'DESC' },
      take: limitNum,
      skip,
    });
    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  async findOne(id: number): Promise<StaffWorkhour> {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`工時彙總 ID ${id} 不存在`);
    }
    return record;
  }

  async findByName(name: string): Promise<StaffWorkhour[]> {
    return this.repository.find({
      where: { name },
      order: { date: 'DESC' },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<StaffWorkhour[]> {
    return this.repository
      .createQueryBuilder('wh')
      .where('wh.date >= :startDate', { startDate })
      .andWhere('wh.date <= :endDate', { endDate })
      .orderBy('wh.date', 'ASC')
      .getMany();
  }
}
