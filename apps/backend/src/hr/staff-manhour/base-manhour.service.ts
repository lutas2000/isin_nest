import { Repository } from 'typeorm';
import { BaseManhour } from './entities/base-manhour.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export abstract class BaseManhourService<T extends BaseManhour> {
  constructor(private repository: Repository<T>) {}

  // 查詢所有工時記錄
  async findAll(
    page?: number,
    limit?: number,
  ): Promise<T[] | PaginatedResponseDto<T>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.repository.findAndCount({
      relations: ['staff'],
      order: { day: 'DESC' } as any,
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  // 根據ID查詢單一工時記錄
  findOne(id: number): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
      relations: ['staff'], // 載入關聯的員工資料
    });
  }

  // 根據員工ID查詢工時記錄
  findByStaffId(staffId: string): Promise<T[]> {
    return this.repository.find({
      where: { staffId } as any,
      relations: ['staff'], // 載入關聯的員工資料
      order: { day: 'DESC' } as any, // 按日期降序排列
    });
  }

  // 根據日期範圍查詢工時記錄
  findByDateRange(startDate: Date, endDate: Date, alias: string): Promise<T[]> {
    return this.repository
      .createQueryBuilder(alias)
      .leftJoinAndSelect(`${alias}.staff`, 'staff')
      .where(`${alias}.day >= :startDate`, { startDate })
      .andWhere(`${alias}.day <= :endDate`, { endDate })
      .orderBy(`${alias}.day`, 'DESC')
      .getMany();
  }

  // 創建新的工時記錄
  async create(manhour: Partial<T>): Promise<T> {
    const newManhour = this.repository.create(manhour as any); // 建立實體
    const saved = await this.repository.save(newManhour); // 儲存到資料庫
    return Array.isArray(saved) ? saved[0] : saved;
  }

  // 更新工時記錄
  async update(id: number, manhour: Partial<T>): Promise<T | null> {
    const updatedManhour = await this.repository.findOneBy({ id } as any);
    if (updatedManhour) {
      Object.assign(updatedManhour, manhour); // 更新實體的屬性
      return this.repository.save(updatedManhour);
    }
    return null;
  }

  // 刪除工時記錄
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  // 根據員工ID和日期查詢特定工時記錄
  findByStaffIdAndDate(staffId: string, date: Date): Promise<T[]> {
    return this.repository.find({
      where: {
        staffId,
        day: date,
      } as any,
      relations: ['staff'],
    });
  }
}
