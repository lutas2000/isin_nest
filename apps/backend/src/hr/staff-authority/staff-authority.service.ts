import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffAuthority } from './entities/staff-authority.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class StaffAuthorityService {
  constructor(
    @InjectRepository(StaffAuthority)
    private readonly repository: Repository<StaffAuthority>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<StaffAuthority[] | PaginatedResponseDto<StaffAuthority>> {
    const pageNum = page ?? 1;
    const limitNum = Math.min(limit ?? 50, 100);
    const skip = (pageNum - 1) * limitNum;
    const [data, total] = await this.repository.findAndCount({
      order: { id: 'ASC' },
      take: limitNum,
      skip,
    });
    return new PaginatedResponseDto(data, total, pageNum, limitNum);
  }

  async findOne(id: string): Promise<StaffAuthority> {
    const record = await this.repository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`權限設定 ID ${id} 不存在`);
    }
    return record;
  }

  async create(dto: Partial<StaffAuthority>): Promise<StaffAuthority> {
    const record = this.repository.create(dto);
    return this.repository.save(record);
  }

  async update(
    id: string,
    dto: Partial<StaffAuthority>,
  ): Promise<StaffAuthority> {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    return this.repository.save(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    await this.repository.remove(record);
  }
}
