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

  async findOne(id: string): Promise<Quote | null> {
    return this.quoteRepository.findOne({
      where: { id },
      relations: ['staff', 'customer', 'quoteItems'],
    });
  }

  async create(quote: Partial<Quote>): Promise<Quote> {
    // 驗證 customerId 是否存在
    if (!quote.customerId) {
      throw new Error('客戶 ID 為必填欄位');
    }

    const customerId = quote.customerId;
    let quoteId: string;

    // 如果已經提供了 ID，使用提供的 ID
    if (quote.id) {
      quoteId = quote.id;
      // 驗證提供的 ID 是否以客戶 ID 開頭
      if (!quoteId.startsWith(customerId)) {
        throw new Error(`報價單 ID 必須以客戶 ID (${customerId}) 開頭`);
      }
      // 檢查 ID 是否已存在
      const existingQuote = await this.quoteRepository.findOneBy({ id: quoteId });
      if (existingQuote) {
        throw new Error(`報價單 ID ${quoteId} 已存在`);
      }
    } else {
      // 自動生成報價單 ID：客戶ID-Q + 序號
      // 查詢該客戶最新的報價單序號
      const lastQuote = await this.quoteRepository
        .createQueryBuilder('quote')
        .where('quote.customer_id = :customerId', { customerId })
        .orderBy('quote.id', 'DESC')
        .getOne();

      let sequenceNumber = 1;
      if (lastQuote) {
        // 從最後一筆報價單 ID 中提取序號（格式：CUST001-Q001）
        const match = lastQuote.id.match(/-Q(\d+)$/);
        if (match) {
          sequenceNumber = parseInt(match[1], 10) + 1;
        }
      }

      // 格式化序號為 3 位數（例如：001, 002, ...）
      const formattedSequence = sequenceNumber.toString().padStart(3, '0');
      quoteId = `${customerId}-Q${formattedSequence}`;
    }

    const newQuote = this.quoteRepository.create({
      ...quote,
      id: quoteId,
    });
    
    return this.quoteRepository.save(newQuote);
  }

  async remove(id: string): Promise<void> {
    await this.quoteRepository.delete(id);
  }

  async update(id: string, quote: Partial<Quote>): Promise<Quote | null> {
    const existingQuote = await this.quoteRepository.findOneBy({ id });
    if (existingQuote) {
      // 不允許修改 ID 和 customerId
      const { id: _, customerId: __, ...updateData } = quote;
      Object.assign(existingQuote, updateData);
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

