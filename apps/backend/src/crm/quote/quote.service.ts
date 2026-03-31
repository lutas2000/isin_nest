import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
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

  /**
   * 產生當日用的報價單編號
   * 規則：(民國年後兩碼)(月)(日)(流水號三碼)
   * 例如：2026/3/28 的第一筆為 150328001
   */
  private async generateQuoteId(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const rocYear = year - 1911;
    const yearPart = rocYear.toString().slice(-2).padStart(2, '0');
    const monthPart = month.toString().padStart(2, '0');
    const dayPart = day.toString().padStart(2, '0');
    const prefix = `${yearPart}${monthPart}${dayPart}`; // 例如 150328

    // 取得當天所有已存在的同前綴編號，取最大流水號 + 1
    const existingQuotes = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.id LIKE :prefix', { prefix: `${prefix}%` })
      .getMany();

    let maxSeq = 0;
    for (const q of existingQuotes) {
      if (!q.id.startsWith(prefix)) continue;
      const suffix = q.id.slice(prefix.length);
      if (/^\d{3}$/.test(suffix)) {
        const num = parseInt(suffix, 10);
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const seqPart = nextSeq.toString().padStart(3, '0');
    return `${prefix}${seqPart}`;
  }

  async findAll(
    page?: number,
    limit?: number,
    isSigned?: boolean,
    days?: number,
  ): Promise<Quote[] | PaginatedResponseDto<Quote>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const where: Record<string, any> = {};
    if (isSigned !== undefined) {
      where.isSigned = isSigned;
    }
    if (days !== undefined && days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = MoreThanOrEqual(since);
    }

    const [data, total] = await this.quoteRepository.findAndCount({
      where,
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

    const newQuote = this.quoteRepository.create({
      ...quote,
      // 不再接受外部指定 ID，統一由系統依規則產生
      id: await this.generateQuoteId(),
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

    // 建立訂單，使用訂單自己的自動編號規則（不再沿用報價單 ID）
    const orderData: Partial<Order> = {
      quoteId: quote.id,
      customerId: quote.customerId,
      staffId: quote.staffId,
      amount: quote.totalAmount,
      shippingMethod,
      paymentMethod,
      status: OrderStatus.PENDING,
      notes: quote.notes,
    };

    const order = await this.orderService.create(orderData);

    // 自動複製 QuoteItem 到 OrderItem 並產生對應工作單
    if (quote.quoteItems && quote.quoteItems.length > 0) {
      for (const quoteItem of quote.quoteItems) {
        // 若報價單工件未設定來源，預設為新圖
        const itemSource = quoteItem.source || SourceType.NEW;

        // 複製 QuoteItem 到 OrderItem（直接複製備注與加工 IDs）
        const orderItem = await this.orderItemService.create({
          orderId: order.id,
          customerFile: quoteItem.customerFile,
          material: quoteItem.material,
          thickness: quoteItem.thickness,
          quantity: quoteItem.quantity,
          unitPrice: quoteItem.unitPrice,
          source: itemSource,
          processingIds: quoteItem.processingIds,
          notes: quoteItem.notes,
          status: 'TODO',
        });

        // 根據來源與加工 IDs 產生對應工作單
        await this.generateWorkOrdersForItem(order, orderItem, itemSource, quoteItem.processingIds);
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

