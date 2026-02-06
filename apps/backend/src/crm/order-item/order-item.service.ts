import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OrderItemService {
  constructor(
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<OrderItem[] | PaginatedResponseDto<OrderItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.orderItemRepository.findAndCount({
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<OrderItem | null> {
    return this.orderItemRepository.findOne({
      where: { id },
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
    });
  }

  async findByOrderId(
    orderId: string,
    page?: number,
    limit?: number,
  ): Promise<OrderItem[] | PaginatedResponseDto<OrderItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.orderItemRepository.findAndCount({
      where: { orderId },
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async create(orderItem: Partial<OrderItem>): Promise<OrderItem> {
    const newOrderItem = this.orderItemRepository.create({
      ...orderItem,
      isNested: orderItem.isNested ?? false,
    });
    return this.orderItemRepository.save(newOrderItem);
  }

  async createMany(orderItems: Partial<OrderItem>[]): Promise<OrderItem[]> {
    const newOrderItems = orderItems.map(item => 
      this.orderItemRepository.create({
        ...item,
        isNested: item.isNested ?? false,
      })
    );
    return this.orderItemRepository.save(newOrderItems);
  }

  async remove(id: number): Promise<void> {
    await this.orderItemRepository.delete(id);
  }

  async update(id: number, orderItem: Partial<OrderItem>): Promise<OrderItem | null> {
    const existingOrderItem = await this.orderItemRepository.findOneBy({ id });
    if (existingOrderItem) {
      Object.assign(existingOrderItem, orderItem);
      return this.orderItemRepository.save(existingOrderItem);
    }
    return null;
  }

  async updateNestingStatus(id: number, nestingId: number | null, isNested: boolean): Promise<OrderItem | null> {
    const orderItem = await this.findOne(id);
    if (orderItem) {
      orderItem.nestingId = nestingId;
      orderItem.isNested = isNested;
      return this.orderItemRepository.save(orderItem);
    }
    return null;
  }
}
