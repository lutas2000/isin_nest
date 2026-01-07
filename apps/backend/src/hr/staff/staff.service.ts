import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>, // 注入 Repository
  ) {}

  /**
   * 取得所有員工（分頁）
   */
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<Staff[] | PaginatedResponseDto<Staff>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.staffRepository.findAndCount({
      order: { id: 'ASC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  /**
   * 取得所有員工（不分頁）
   * 給前端下拉選單等場景使用，保證回傳為純陣列，並支援簡單條件篩選。
   */
  async findAllWithoutPagination(filter?: { department?: string }): Promise<Staff[]> {
    const where: Partial<Staff> = {};

    if (filter?.department) {
      where.department = filter.department;
    }

    return this.staffRepository.find({
      where,
      order: { id: 'ASC' },
    });
  }

  findOne(id: string): Promise<Staff | null> {
    return this.staffRepository.findOneBy({ id });
  }

  async create(staff: Partial<Staff>): Promise<Staff> {
    const newStaff = this.staffRepository.create(staff); // 建立實體
    return this.staffRepository.save(newStaff); // 儲存到資料庫
  }

  async remove(id: string): Promise<void> {
    await this.staffRepository.delete(id);
  }

  async update(id: string, staff: Partial<Staff>): Promise<Staff | null> {
    const updatedStaff = await this.staffRepository.findOneBy({ id });
    if (updatedStaff) {
      Object.assign(updatedStaff, staff); // 更新實體的屬性
      return this.staffRepository.save(updatedStaff);
    }
    return null;
  }
}
