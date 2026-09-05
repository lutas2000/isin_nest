import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class StaffManhour2Service {
  constructor(
    @InjectRepository(StaffManhour2)
    private readonly repository: Repository<StaffManhour2>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffManhour2[] | PaginatedResponseDto<StaffManhour2>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const skip = (pageNum - 1) * limitNum;
    const [data, total] = await this.repository.findAndCount({
      order: { id: 'DESC' },
      take: limitNum,
      skip,
    });
    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  findOne(id: number): Promise<StaffManhour2 | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByName(name: string): Promise<StaffManhour2[]> {
    return this.repository.find({ where: { name }, order: { id: 'DESC' } });
  }

  async create(dto: Partial<StaffManhour2>): Promise<StaffManhour2> {
    const record = this.repository.create(dto);
    return this.repository.save(record);
  }

  async update(
    id: number,
    dto: Partial<StaffManhour2>,
  ): Promise<StaffManhour2 | null> {
    const record = await this.repository.findOneBy({ id });
    if (!record) return null;
    Object.assign(record, dto);
    return this.repository.save(record);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
