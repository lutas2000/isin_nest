import { Repository } from 'typeorm';
import { BaseManhour } from './entities/base-manhour.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export abstract class BaseManhourService<T extends BaseManhour> {
  constructor(private repository: Repository<T>) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<T[] | PaginatedResponseDto<T>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.repository.findAndCount({
      order: { day: 'DESC' } as any,
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
    });
  }

  findByName(name: string): Promise<T[]> {
    return this.repository.find({
      where: { name } as any,
      order: { day: 'DESC' } as any,
    });
  }

  findByDateRange(startDate: Date, endDate: Date, alias: string): Promise<T[]> {
    return this.repository
      .createQueryBuilder(alias)
      .where(`${alias}.day >= :startDate`, { startDate })
      .andWhere(`${alias}.day <= :endDate`, { endDate })
      .orderBy(`${alias}.day`, 'DESC')
      .getMany();
  }

  async create(manhour: Partial<T>): Promise<T> {
    const newManhour = this.repository.create(manhour as any);
    const saved = await this.repository.save(newManhour);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, manhour: Partial<T>): Promise<T | null> {
    const updatedManhour = await this.repository.findOneBy({ id } as any);
    if (updatedManhour) {
      Object.assign(updatedManhour, manhour);
      return this.repository.save(updatedManhour);
    }
    return null;
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  findByNameAndDate(name: string, date: Date): Promise<T[]> {
    return this.repository.find({
      where: {
        name,
        day: date,
      } as any,
    });
  }
}
