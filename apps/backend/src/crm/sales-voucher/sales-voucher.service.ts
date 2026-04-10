import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SalesVoucher } from './entities/sales-voucher.entity';
import { SalesVoucherItem } from '../sales-voucher-item/entities/sales-voucher-item.entity';
import { OrderService } from '../order/order.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateSalesVoucherDto, CreateSalesVoucherItemDto } from './dto/create-sales-voucher.dto';

@Injectable()
export class SalesVoucherService {
  constructor(
    @InjectRepository(SalesVoucher)
    private readonly voucherRepository: Repository<SalesVoucher>,
    @InjectRepository(SalesVoucherItem)
    private readonly itemRepository: Repository<SalesVoucherItem>,
    private readonly orderService: OrderService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 銷貨單編號：SV + (民國年後兩碼)(月)(日) + 三位流水
   */
  private async generateId(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const rocYear = year - 1911;
    const yearPart = rocYear.toString().slice(-2).padStart(2, '0');
    const monthPart = month.toString().padStart(2, '0');
    const dayPart = day.toString().padStart(2, '0');
    const prefix = `SV${yearPart}${monthPart}${dayPart}`;

    const existing = await this.voucherRepository
      .createQueryBuilder('v')
      .where('v.id LIKE :prefix', { prefix: `${prefix}%` })
      .getMany();

    let maxSeq = 0;
    for (const v of existing) {
      if (!v.id.startsWith(prefix)) continue;
      const suffix = v.id.slice(prefix.length);
      if (/^\d{3}$/.test(suffix)) {
        const num = parseInt(suffix, 10);
        if (num > maxSeq) maxSeq = num;
      }
    }

    const seqPart = (maxSeq + 1).toString().padStart(3, '0');
    return `${prefix}${seqPart}`;
  }

  private async recalculateAmountInManager(
    manager: EntityManager,
    voucherId: string,
  ): Promise<void> {
    const result = await manager
      .createQueryBuilder(SalesVoucherItem, 'i')
      .select('COALESCE(SUM(i.quantity * i.unit_price), 0)', 'sum')
      .where('i.sales_voucher_id = :vid', { vid: voucherId })
      .getRawOne<{ sum: string }>();
    const sum = parseFloat(result?.sum ?? '0') || 0;
    await manager.update(SalesVoucher, { id: voucherId }, { amount: sum });
  }

  private mapDtoToItem(
    salesVoucherId: string,
    dto: CreateSalesVoucherItemDto,
  ): Partial<SalesVoucherItem> {
    return {
      salesVoucherId,
      cadFile: dto.cadFile,
      customerFile: dto.customerFile,
      material: dto.material,
      thickness: dto.thickness,
      quantity: dto.quantity ?? 0,
      substitute: dto.substitute,
      source: dto.source,
      processingIds: dto.processingIds,
      unitPrice: dto.unitPrice ?? 0,
      estimatedCuttingTime: dto.estimatedCuttingTime,
      drawingNumber: dto.drawingNumber,
      nestingId: dto.nestingId ?? null,
      status: dto.status ?? 'TODO',
      notes: dto.notes,
    };
  }

  async create(dto: CreateSalesVoucherDto): Promise<SalesVoucher> {
    if (dto.sourceOrderId) {
      return this.createFromOrder(dto.sourceOrderId, dto.tax ?? 0);
    }

    if (
      !dto.staffId ||
      !dto.customerId ||
      !dto.shippingMethod ||
      !dto.paymentMethod
    ) {
      throw new BadRequestException(
        '手動建立時 staffId、customerId、shippingMethod、paymentMethod 為必填',
      );
    }

    const id = await this.generateId();
    const tax = dto.tax ?? 0;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const voucher = queryRunner.manager.create(SalesVoucher, {
        id,
        orderId: dto.orderId ?? null,
        staffId: dto.staffId,
        customerId: dto.customerId,
        shippingMethod: dto.shippingMethod,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        amount: 0,
        tax,
      });
      await queryRunner.manager.save(voucher);

      if (dto.items?.length) {
        for (const row of dto.items) {
          if (!row.source) {
            throw new BadRequestException('明細 source 為必填');
          }
          const item = queryRunner.manager.create(
            SalesVoucherItem,
            this.mapDtoToItem(id, row),
          );
          await queryRunner.manager.save(item);
        }
        await this.recalculateAmountInManager(queryRunner.manager, id);
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    const result = await this.findOne(id);
    if (!result) throw new NotFoundException(id);
    return result;
  }

  private async createFromOrder(
    sourceOrderId: string,
    tax: number,
  ): Promise<SalesVoucher> {
    const order = await this.orderService.findOne(sourceOrderId);
    if (!order) {
      throw new NotFoundException(`訂單 ${sourceOrderId} 不存在`);
    }

    const id = await this.generateId();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const voucher = queryRunner.manager.create(SalesVoucher, {
        id,
        orderId: sourceOrderId,
        staffId: order.staffId,
        customerId: order.customerId,
        shippingMethod: order.shippingMethod,
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        amount: 0,
        tax,
      });
      await queryRunner.manager.save(voucher);

      const orderItems = order.orderItems ?? [];
      for (const oi of orderItems) {
        const item = queryRunner.manager.create(SalesVoucherItem, {
          salesVoucherId: id,
          cadFile: oi.cadFile,
          customerFile: oi.customerFile,
          material: oi.material,
          thickness: oi.thickness,
          quantity: oi.quantity,
          substitute: oi.substitute,
          source: oi.source,
          processingIds: oi.processingIds,
          unitPrice: oi.unitPrice,
          estimatedCuttingTime: oi.estimatedCuttingTime,
          drawingNumber: oi.drawingNumber,
          nestingId: oi.nestingId,
          status: oi.status,
          notes: oi.notes,
        });
        await queryRunner.manager.save(item);
      }

      await this.recalculateAmountInManager(queryRunner.manager, id);
      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    const result = await this.findOne(id);
    if (!result) throw new NotFoundException(id);
    return result;
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<SalesVoucher[] | PaginatedResponseDto<SalesVoucher>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.voucherRepository.findAndCount({
      relations: ['staff', 'customer', 'order', 'salesVoucherItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: string): Promise<SalesVoucher | null> {
    return this.voucherRepository.findOne({
      where: { id },
      relations: ['staff', 'customer', 'order', 'salesVoucherItems'],
    });
  }

  async update(
    id: string,
    data: Partial<SalesVoucher>,
  ): Promise<SalesVoucher | null> {
    const existing = await this.voucherRepository.findOneBy({ id });
    if (!existing) return null;
    const {
      id: _id,
      amount: _amount,
      salesVoucherItems: _i,
      staff: _s,
      customer: _c,
      order: _o,
      createdAt: _ca,
      updatedAt: _ua,
      ...rest
    } = data as any;
    Object.assign(existing, rest);
    const saved = await this.voucherRepository.save(existing);
    return this.findOne(saved.id);
  }

  async remove(id: string): Promise<void> {
    await this.voucherRepository.delete(id);
  }
}
