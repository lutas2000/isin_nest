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
    // 如果沒有提供分頁參數，返回所有數據（數組）
    if (page === undefined && limit === undefined) {
      return await this.quoteItemRepository.find({
        relations: ['quote'],
        order: { createdAt: 'DESC' },
      });
    }

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

  findOne(id: string): Promise<QuoteItem | null> {
    return this.quoteItemRepository.findOne({
      where: { id },
      relations: ['quote'],
    });
  }

  async findByQuoteId(
    quoteId: string,
    page?: number,
    limit?: number,
  ): Promise<QuoteItem[] | PaginatedResponseDto<QuoteItem>> {
    // 如果沒有提供分頁參數，返回所有數據（數組）
    if (page === undefined && limit === undefined) {
      return await this.quoteItemRepository.find({
        where: { quoteId },
        relations: ['quote'],
        order: { createdAt: 'DESC' },
      });
    }

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
  private async recalculateQuoteTotal(quoteId: string): Promise<void> {
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
    // 驗證 quoteId 是否存在
    if (!quoteItem.quoteId) {
      throw new Error('報價單 ID 為必填欄位');
    }

    // 自動生成 QuoteItem ID：格式為 {quoteId}_{序號}
    // 查找該報價單的所有工件，找出最大序號
    const existingItems = await this.quoteItemRepository.find({
      where: { quoteId: quoteItem.quoteId },
    });

    // 從現有工件的 ID 中提取序號
    let maxSequence = 0;
    if (existingItems.length > 0) {
      const sequences = existingItems
        .map(item => {
          // ID 格式為 {quoteId}_{序號}，例如 '00010301_1'
          const parts = item.id.split('_');
          if (parts.length === 2 && parts[0] === quoteItem.quoteId) {
            const seq = parseInt(parts[1], 10);
            return isNaN(seq) ? 0 : seq;
          }
          return 0;
        })
        .filter(seq => seq > 0);
      
      if (sequences.length > 0) {
        maxSequence = Math.max(...sequences);
      }
    }

    // 生成新的序號
    const newSequence = maxSequence + 1;
    const newId = `${quoteItem.quoteId}_${newSequence}`;

    // 創建新的 QuoteItem
    const newQuoteItem = this.quoteItemRepository.create({
      ...quoteItem,
      id: newId,
    });
    
    const savedItem = await this.quoteItemRepository.save(newQuoteItem);
    
    // 重新計算報價單總價
    if (savedItem.quoteId) {
      await this.recalculateQuoteTotal(savedItem.quoteId);
    }
    
    return savedItem;
  }

  async remove(id: string): Promise<void> {
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

  async update(id: string, quoteItem: Partial<QuoteItem>): Promise<QuoteItem | null> {
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

