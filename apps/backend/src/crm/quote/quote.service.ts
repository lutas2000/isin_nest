import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { WorkOrderService } from '../work-order/work-order.service';
import { WorkOrder } from '../work-order/entities/work-order.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @Inject(forwardRef(() => WorkOrderService))
    private workOrderService: WorkOrderService,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<Quote[] | PaginatedResponseDto<Quote>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.quoteRepository.findAndCount({
      relations: ['staff', 'customer', 'quoteItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: string): Promise<Quote | null> {
    return this.quoteRepository.findOne({
      where: { id },
      relations: ['staff', 'customer', 'quoteItems'],
    });
  }

  async create(quote: Partial<Quote>): Promise<Quote> {
    const newQuote = this.quoteRepository.create(quote);
    return this.quoteRepository.save(newQuote);
  }

  async remove(id: string): Promise<void> {
    await this.quoteRepository.delete(id);
  }

  async update(id: string, quote: Partial<Quote>): Promise<Quote | null> {
    const existingQuote = await this.quoteRepository.findOneBy({ id });
    if (existingQuote) {
      Object.assign(existingQuote, quote);
      return this.quoteRepository.save(existingQuote);
    }
    return null;
  }

  async convertToWorkOrder(quoteId: string): Promise<WorkOrder | null> {
    const quote = await this.findOne(quoteId);
    if (!quote || !quote.isSigned) {
      return null; // 報價單不存在或未簽名
    }

    // 建立工單
    const workOrderData: Partial<WorkOrder> = {
      customerId: quote.customerId,
      staffId: quote.staffId,
      amount: quote.totalAmount,
      notes: `由報價單 #${quote.id} 轉換`,
    };

    return this.workOrderService.create(workOrderData);
  }
}

