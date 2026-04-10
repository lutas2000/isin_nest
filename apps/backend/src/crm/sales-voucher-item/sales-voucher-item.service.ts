import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesVoucherItem } from './entities/sales-voucher-item.entity';
import { SalesVoucher } from '../sales-voucher/entities/sales-voucher.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class SalesVoucherItemService {
  constructor(
    @InjectRepository(SalesVoucherItem)
    private readonly itemRepository: Repository<SalesVoucherItem>,
    @InjectRepository(SalesVoucher)
    private readonly voucherRepository: Repository<SalesVoucher>,
  ) {}

  async syncParentAmount(salesVoucherId: string): Promise<void> {
    const result = await this.itemRepository
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.quantity * i.unit_price), 0)', 'sum')
      .where('i.sales_voucher_id = :vid', { vid: salesVoucherId })
      .getRawOne<{ sum: string }>();
    const sum = parseFloat(result?.sum ?? '0') || 0;
    await this.voucherRepository.update({ id: salesVoucherId }, { amount: sum });
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<SalesVoucherItem[] | PaginatedResponseDto<SalesVoucherItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.itemRepository.findAndCount({
      relations: ['salesVoucher'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findBySalesVoucherId(
    salesVoucherId: string,
    page?: number,
    limit?: number,
  ): Promise<SalesVoucherItem[] | PaginatedResponseDto<SalesVoucherItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.itemRepository.findAndCount({
      where: { salesVoucherId },
      order: { id: 'ASC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<SalesVoucherItem | null> {
    return this.itemRepository.findOne({
      where: { id },
      relations: ['salesVoucher'],
    });
  }

  async create(item: Partial<SalesVoucherItem>): Promise<SalesVoucherItem> {
    const row = this.itemRepository.create(item);
    const saved = await this.itemRepository.save(row);
    await this.syncParentAmount(saved.salesVoucherId);
    return saved;
  }

  async update(id: number, data: Partial<SalesVoucherItem>): Promise<SalesVoucherItem | null> {
    const existing = await this.itemRepository.findOneBy({ id });
    if (!existing) return null;
    Object.assign(existing, data);
    const saved = await this.itemRepository.save(existing);
    await this.syncParentAmount(saved.salesVoucherId);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const existing = await this.itemRepository.findOneBy({ id });
    if (!existing) return;
    const vid = existing.salesVoucherId;
    await this.itemRepository.delete(id);
    await this.syncParentAmount(vid);
  }
}
