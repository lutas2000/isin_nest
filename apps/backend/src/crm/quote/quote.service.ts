import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { OrderService } from '../order/order.service';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { OrderItemService } from '../order-item/order-item.service';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { DesignWorkOrderService } from '../design-work-order/design-work-order.service';
import { CuttingWorkOrderService } from '../cutting-work-order/cutting-work-order.service';
import { ProcessingWorkOrderService } from '../processing-work-order/processing-work-order.service';
import { DeliveryWorkOrderService } from '../delivery-work-order/delivery-work-order.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { SourceType } from '../enums/source-type.enum';

@Injectable()
export class QuoteService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    @Inject(forwardRef(() => OrderItemService))
    private orderItemService: OrderItemService,
    @Inject(forwardRef(() => DesignWorkOrderService))
    private designWorkOrderService: DesignWorkOrderService,
    @Inject(forwardRef(() => CuttingWorkOrderService))
    private cuttingWorkOrderService: CuttingWorkOrderService,
    @Inject(forwardRef(() => ProcessingWorkOrderService))
    private processingWorkOrderService: ProcessingWorkOrderService,
    @Inject(forwardRef(() => DeliveryWorkOrderService))
    private deliveryWorkOrderService: DeliveryWorkOrderService,
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

  async convertToOrder(
    quoteId: string,
    shippingMethod: string,
    paymentMethod: string,
  ): Promise<Order | null> {
    const quote = await this.findOne(quoteId);
    if (!quote || !quote.isSigned) {
      return null; // 報價單不存在或未簽名
    }

    // 驗證必填欄位
    if (!shippingMethod || !paymentMethod) {
      throw new Error('運送方式和付款方式為必填欄位');
    }

    // 檢查訂貨單 ID 是否已存在
    const existingOrder = await this.orderRepository.findOneBy({ id: quote.id });
    if (existingOrder) {
      throw new Error(`訂貨單 ID ${quote.id} 已存在`);
    }

    // 建立訂貨單，直接使用報價單 ID
    const orderData: Partial<Order> = {
      id: quote.id,
      quoteId: quote.id,
      customerId: quote.customerId,
      staffId: quote.staffId,
      amount: quote.totalAmount,
      shippingMethod,
      paymentMethod,
      status: OrderStatus.PENDING,
      notes: `由報價單 #${quote.id} 轉換`,
    };

    const order = await this.orderService.create(orderData);

    // 自動複製 QuoteItem 到 OrderItem 並產生對應工作單
    if (quote.quoteItems && quote.quoteItems.length > 0) {
      for (const quoteItem of quote.quoteItems) {
        // 複製 QuoteItem 到 OrderItem（直接複製備注與加工 IDs）
        const orderItem = await this.orderItemService.create({
          orderId: order.id,
          customerFile: quoteItem.customerFile,
          material: quoteItem.material,
          thickness: quoteItem.thickness,
          quantity: quoteItem.quantity,
          unitPrice: quoteItem.unitPrice,
          source: quoteItem.source || '報價單轉換',
          processingIds: quoteItem.processingIds,
          notes: quoteItem.notes,
          status: 'TODO',
          isNested: false,
        });

        // 根據來源與加工 IDs 產生對應工作單
        await this.generateWorkOrdersForItem(order, orderItem, quoteItem.source, quoteItem.processingIds);
      }
    }

    // 若運送方式為「送貨」，產生送貨工作單
    if (shippingMethod === '送貨' || shippingMethod === '快遞' || shippingMethod === '貨運') {
      await this.deliveryWorkOrderService.create({
        orderId: order.id,
        deliveryAddress: quote.customer?.deliveryAddress || quote.customer?.address,
        status: 'pending' as any,
      });
    }

    return order;
  }

  // 根據工件來源和加工需求產生對應工作單
  private async generateWorkOrdersForItem(
    order: Order,
    orderItem: OrderItem,
    source?: string,
    processingIds?: number[],
  ): Promise<void> {
    // 根據來源判斷是否需要設計工作單
    const needsDesign = source === SourceType.NEW || 
                        source === SourceType.MODIFIED ||
                        source === '新圖' ||
                        source === '修改';

    if (needsDesign) {
      // 新圖或修改 → 產生設計工作單
      await this.designWorkOrderService.create({
        orderId: order.id,
        orderItemId: orderItem.id,
        customerFile: orderItem.customerFile,
        status: 'pending' as any,
      });
    } else {
      // 舊圖 → 直接產生切割工作單
      await this.cuttingWorkOrderService.create({
        orderId: order.id,
        material: orderItem.material,
        thickness: orderItem.thickness,
        status: 'pending' as any,
      });
    }

    // 根據後加工需求判斷是否需要加工工作單
    if (processingIds && processingIds.length > 0) {
      for (const processingId of processingIds) {
        // 產生加工工作單（連結到 Processing 主檔）
        await this.processingWorkOrderService.create({
          orderId: order.id,
          orderItemId: orderItem.id,
          processingId,
        });
      }
    }
  }
}

