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
    @InjectRepository(WorkOrder)
    private workOrderRepository: Repository<WorkOrder>,
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

    let quoteId: string;

    // 如果已經提供了 ID，使用提供的 ID
    if (quote.id) {
      quoteId = quote.id;
      // 檢查 ID 是否已存在
      const existingQuote = await this.quoteRepository.findOneBy({ id: quoteId });
      if (existingQuote) {
        throw new Error(`報價單 ID ${quoteId} 已存在`);
      }
    } else {
      // 自動生成報價單 ID：純數字格式（例如：00010301, 00010302, ...）
      // 查找所有純數字的報價單 ID，找出最大序號
      const allQuotes = await this.quoteRepository
        .createQueryBuilder('quote')
        .getMany();
      
      let sequenceNumber = 10301; // 預設起始序號
      if (allQuotes.length > 0) {
        // 從所有純數字的報價單 ID 中提取數字，找出最大值
        const numbers = allQuotes
          .map(q => {
            // 只處理純數字的 ID
            if (/^\d+$/.test(q.id)) {
              return parseInt(q.id, 10);
            }
            return 0;
          })
          .filter(n => n > 0);
        
        if (numbers.length > 0) {
          sequenceNumber = Math.max(...numbers) + 1;
        }
      }

      // 格式化序號為 8 位數（例如：00010301, 00010302, ...）
      quoteId = sequenceNumber.toString().padStart(8, '0');
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
      // 只排除 ID，允許修改 customerId 和其他欄位
      const { id: _, ...updateData } = quote;
      Object.assign(existingQuote, updateData);
      return this.quoteRepository.save(existingQuote);
    }
    return null;
  }

  async convertToWorkOrder(
    quoteId: string,
    shippingMethod: string,
    paymentMethod: string,
  ): Promise<WorkOrder | null> {
    const quote = await this.findOne(quoteId);
    if (!quote || !quote.isSigned) {
      return null; // 報價單不存在或未簽名
    }

    // 驗證必填欄位
    if (!shippingMethod || !paymentMethod) {
      throw new Error('運送方式和付款方式為必填欄位');
    }

    // 檢查工單 ID 是否已存在
    const existingWorkOrder = await this.workOrderRepository.findOneBy({ id: quote.id });
    if (existingWorkOrder) {
      throw new Error(`工單 ID ${quote.id} 已存在`);
    }

    // 建立工單，直接使用報價單 ID
    const workOrderData: Partial<WorkOrder> = {
      id: quote.id,
      customerId: quote.customerId,
      staffId: quote.staffId,
      amount: quote.totalAmount,
      shippingMethod,
      paymentMethod,
      notes: `由報價單 #${quote.id} 轉換`,
    };

    return this.workOrderService.create(workOrderData);
  }
}

