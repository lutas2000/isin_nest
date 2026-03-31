import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * 產生當日用的訂單編號
   * 規則：(民國年後兩碼)(月)(日)(流水號三碼)
   * 例如：2026/3/28 的第一筆為 150328001
   */
  private async generateOrderId(date: Date = new Date()): Promise<string> {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const rocYear = year - 1911;
    const yearPart = rocYear.toString().slice(-2).padStart(2, '0');
    const monthPart = month.toString().padStart(2, '0');
    const dayPart = day.toString().padStart(2, '0');
    const prefix = `${yearPart}${monthPart}${dayPart}`; // 例如 150328

    const existingOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id LIKE :prefix', { prefix: `${prefix}%` })
      .getMany();

    let maxSeq = 0;
    for (const o of existingOrders) {
      if (!o.id.startsWith(prefix)) continue;
      const suffix = o.id.slice(prefix.length);
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
    isCompleted?: boolean,
  ): Promise<Order[] | PaginatedResponseDto<Order>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const where: Record<string, any> = {};
    if (isCompleted !== undefined) {
      where.isCompleted = isCompleted;
    }

    const [data, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['staff', 'customer', 'orderItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: string): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id },
      relations: ['staff', 'customer', 'orderItems'],
    });
  }

  async create(order: Partial<Order>): Promise<Order> {
    const newOrder = this.orderRepository.create({
      ...order,
      // 不再接受外部指定 ID，統一由系統依規則產生
      id: await this.generateOrderId(),
      status: order.status || OrderStatus.PENDING,
    });
    return this.orderRepository.save(newOrder);
  }

  async remove(id: string): Promise<void> {
    await this.orderRepository.delete(id);
  }

  async update(id: string, order: Partial<Order>): Promise<Order | null> {
    const existingOrder = await this.orderRepository.findOneBy({ id });
    if (existingOrder) {
      Object.assign(existingOrder, order);
      return this.orderRepository.save(existingOrder);
    }
    return null;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const order = await this.findOne(id);
    if (order) {
      order.status = status;
      if (status === OrderStatus.COMPLETED) {
        order.isCompleted = true;
        order.endedAt = new Date();
      }
      return this.orderRepository.save(order);
    }
    return null;
  }

  async complete(id: string): Promise<Order | null> {
    return this.updateStatus(id, OrderStatus.COMPLETED);
  }
}
