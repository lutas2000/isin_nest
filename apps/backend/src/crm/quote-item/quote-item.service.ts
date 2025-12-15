import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteItem } from './entities/quote-item.entity';

@Injectable()
export class QuoteItemService {
  constructor(
    @InjectRepository(QuoteItem)
    private quoteItemRepository: Repository<QuoteItem>,
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

  async create(quoteItem: Partial<QuoteItem>): Promise<QuoteItem> {
    const newQuoteItem = this.quoteItemRepository.create(quoteItem);
    return this.quoteItemRepository.save(newQuoteItem);
  }

  async remove(id: number): Promise<void> {
    await this.quoteItemRepository.delete(id);
  }

  async update(id: number, quoteItem: Partial<QuoteItem>): Promise<QuoteItem | null> {
    const existingQuoteItem = await this.quoteItemRepository.findOneBy({ id });
    if (existingQuoteItem) {
      Object.assign(existingQuoteItem, quoteItem);
      return this.quoteItemRepository.save(existingQuoteItem);
    }
    return null;
  }
}

