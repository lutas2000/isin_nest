import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from '../quote/entities/quote.entity';

@Injectable()
export class QuoteItemService {
  constructor(
    @InjectRepository(QuoteItem)
    private quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
  ) {}

  findAll(): Promise<QuoteItem[]> {
    return this.quoteItemRepository.find({
      relations: ['quote'],
    });
  }

  findOne(id: number): Promise<QuoteItem | null> {
    return this.quoteItemRepository.findOne({
      where: { id },
      relations: ['quote'],
    });
  }

  findByQuoteId(quoteId: number): Promise<QuoteItem[]> {
    return this.quoteItemRepository.find({
      where: { quoteId },
      relations: ['quote'],
    });
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

