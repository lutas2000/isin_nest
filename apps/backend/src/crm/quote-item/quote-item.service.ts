import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from '../quote/entities/quote.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class QuoteItemService {
  constructor(
    @InjectRepository(QuoteItem)
    private quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<QuoteItem[] | PaginatedResponseDto<QuoteItem>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.quoteItemRepository.findAndCount({
      relations: ['quote'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<QuoteItem | null> {
    return this.quoteItemRepository.findOne({
      where: { id },
      relations: ['quote'],
    });
  }

  async findByQuoteId(
    quoteId: number,
    page?: number,
    limit?: number,
  ): Promise<QuoteItem[] | PaginatedResponseDto<QuoteItem>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.quoteItemRepository.findAndCount({
      where: { quoteId },
      relations: ['quote'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  /**
   * 重新計算報價單總價
   */
  private async recalculateQuoteTotal(quoteId: number): Promise<void> {
    // 獲取該報價單的所有工件
    const quoteItems = await this.quoteItemRepository.find({
      where: { quoteId },
    });

    // 計算總價：所有工件的 (單價 × 數量) 的總和
    const totalAmount = quoteItems.reduce((sum, item) => {
      const itemTotal = Number(item.unitPrice) * item.quantity;
      return sum + itemTotal;
    }, 0);

    // 更新報價單的總價
    await this.quoteRepository.update(quoteId, {
      totalAmount: totalAmount,
    });
  }

  async create(quoteItem: Partial<QuoteItem>): Promise<QuoteItem> {
    const newQuoteItem = this.quoteItemRepository.create(quoteItem);
    const savedItem = await this.quoteItemRepository.save(newQuoteItem);
    
    // 重新計算報價單總價
    if (savedItem.quoteId) {
      await this.recalculateQuoteTotal(savedItem.quoteId);
    }
    
    return savedItem;
  }

  async remove(id: number): Promise<void> {
    // 先獲取要刪除的工件，以便知道屬於哪個報價單
    const quoteItem = await this.quoteItemRepository.findOneBy({ id });
    if (!quoteItem) {
      return;
    }

    const quoteId = quoteItem.quoteId;
    
    // 刪除工件
    await this.quoteItemRepository.delete(id);
    
    // 重新計算報價單總價
    await this.recalculateQuoteTotal(quoteId);
  }

  async update(id: number, quoteItem: Partial<QuoteItem>): Promise<QuoteItem | null> {
    const existingQuoteItem = await this.quoteItemRepository.findOneBy({ id });
    if (!existingQuoteItem) {
      return null;
    }

    const quoteId = existingQuoteItem.quoteId;
    
    Object.assign(existingQuoteItem, quoteItem);
    const updatedItem = await this.quoteItemRepository.save(existingQuoteItem);
    
    // 重新計算報價單總價
    await this.recalculateQuoteTotal(quoteId);
    
    return updatedItem;
  }
}

