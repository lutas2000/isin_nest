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

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<Order[] | PaginatedResponseDto<Order>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.orderRepository.findAndCount({
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
