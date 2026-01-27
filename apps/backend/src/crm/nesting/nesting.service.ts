import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nesting, NestingStatus } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class NestingService {
  constructor(
    @InjectRepository(Nesting)
    private nestingRepository: Repository<Nesting>,
    @InjectRepository(NestingItem)
    private nestingItemRepository: Repository<NestingItem>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<Nesting>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.nestingRepository.findAndCount({
      relations: ['order', 'designWorkOrder', 'nestingItems', 'nestingItems.orderItem'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<Nesting[]> {
    return this.nestingRepository.find({
      where: { orderId },
      relations: ['order', 'designWorkOrder', 'nestingItems', 'nestingItems.orderItem'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Nesting> {
    const nesting = await this.nestingRepository.findOne({
      where: { id },
      relations: ['order', 'designWorkOrder', 'nestingItems', 'nestingItems.orderItem'],
    });

    if (!nesting) {
      throw new NotFoundException(`排版 ID ${id} 不存在`);
    }

    return nesting;
  }

  async create(data: Partial<Nesting>): Promise<Nesting> {
    // 如果沒有提供排版圖號，自動生成
    if (!data.nestingNumber) {
      data.nestingNumber = await this.generateNestingNumber(data.orderId!);
    }

    const nesting = this.nestingRepository.create({
      ...data,
      status: data.status || NestingStatus.DRAFT,
    });
    return this.nestingRepository.save(nesting);
  }

  async update(id: number, data: Partial<Nesting>): Promise<Nesting> {
    const nesting = await this.findOne(id);
    Object.assign(nesting, data);
    return this.nestingRepository.save(nesting);
  }

  async finalize(id: number): Promise<Nesting> {
    const nesting = await this.findOne(id);
    nesting.status = NestingStatus.FINALIZED;

    // 更新關聯的 OrderItem 為已排版狀態
    if (nesting.nestingItems && nesting.nestingItems.length > 0) {
      for (const item of nesting.nestingItems) {
        await this.orderItemRepository.update(item.orderItemId, {
          isNested: true,
          nestingId: nesting.id,
        });
      }
    }

    return this.nestingRepository.save(nesting);
  }

  async remove(id: number): Promise<void> {
    const nesting = await this.findOne(id);

    // 如果排版已定案，需要更新關聯的 OrderItem
    if (nesting.status === NestingStatus.FINALIZED && nesting.nestingItems) {
      for (const item of nesting.nestingItems) {
        await this.orderItemRepository.update(item.orderItemId, {
          isNested: false,
          nestingId: null,
        });
      }
    }

    await this.nestingRepository.remove(nesting);
  }

  // 排版工件管理
  async addItem(nestingId: number, orderItemId: number, quantity: number = 1): Promise<NestingItem> {
    await this.findOne(nestingId); // 確認排版存在

    const nestingItem = this.nestingItemRepository.create({
      nestingId,
      orderItemId,
      quantity,
    });
    return this.nestingItemRepository.save(nestingItem);
  }

  async updateItem(id: number, quantity: number): Promise<NestingItem> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    nestingItem.quantity = quantity;
    return this.nestingItemRepository.save(nestingItem);
  }

  async removeItem(id: number): Promise<void> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    await this.nestingItemRepository.remove(nestingItem);
  }

  // 生成排版圖號
  // 格式：前三碼客戶型號 + 年份代號 + 月份 + 日期 + 流水號 + 版次
  private async generateNestingNumber(orderId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 取年份後兩位
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // 取訂單ID前三碼作為客戶型號前綴
    const prefix = orderId.slice(0, 3).toUpperCase();
    const dateCode = `${year}${month}${day}`;
    
    // 查找今天已經建立的排版數量
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const todayCount = await this.nestingRepository
      .createQueryBuilder('nesting')
      .where('nesting.created_at >= :startOfDay', { startOfDay })
      .andWhere('nesting.created_at < :endOfDay', { endOfDay })
      .getCount();
    
    // 流水號（A, B, C... 或 01, 02, 03...）
    const sequence = String.fromCharCode(65 + todayCount); // A, B, C...
    const version = '01'; // 版次
    
    return `${prefix}${dateCode}${sequence}${version}`;
  }
}
