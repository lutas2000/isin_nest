import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryWorkOrder } from './entities/delivery-work-order.entity';
import { DeliveryWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class DeliveryWorkOrderService {
  constructor(
    @InjectRepository(DeliveryWorkOrder)
    private deliveryWorkOrderRepository: Repository<DeliveryWorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<DeliveryWorkOrder>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.deliveryWorkOrderRepository.findAndCount({
      relations: ['order', 'driver'],
      order: { scheduledDate: 'ASC', createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<DeliveryWorkOrder[]> {
    return this.deliveryWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'driver'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByDriverId(driverId: string): Promise<DeliveryWorkOrder[]> {
    return this.deliveryWorkOrderRepository.find({
      where: { driverId },
      relations: ['order', 'driver'],
      order: { scheduledDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByStatus(status: DeliveryWorkOrderStatus): Promise<DeliveryWorkOrder[]> {
    return this.deliveryWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'driver'],
      order: { scheduledDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<DeliveryWorkOrder> {
    const deliveryWorkOrder = await this.deliveryWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'driver'],
    });

    if (!deliveryWorkOrder) {
      throw new NotFoundException(`送貨工作單 ID ${id} 不存在`);
    }

    return deliveryWorkOrder;
  }

  async create(data: Partial<DeliveryWorkOrder>): Promise<DeliveryWorkOrder> {
    const deliveryWorkOrder = this.deliveryWorkOrderRepository.create({
      ...data,
      status: data.status || DeliveryWorkOrderStatus.PENDING,
    });
    return this.deliveryWorkOrderRepository.save(deliveryWorkOrder);
  }

  async update(id: number, data: Partial<DeliveryWorkOrder>): Promise<DeliveryWorkOrder> {
    const deliveryWorkOrder = await this.findOne(id);
    Object.assign(deliveryWorkOrder, data);
    return this.deliveryWorkOrderRepository.save(deliveryWorkOrder);
  }

  async updateStatus(id: number, status: DeliveryWorkOrderStatus): Promise<DeliveryWorkOrder> {
    const deliveryWorkOrder = await this.findOne(id);
    deliveryWorkOrder.status = status;

    if (status === DeliveryWorkOrderStatus.DELIVERED && !deliveryWorkOrder.deliveredAt) {
      deliveryWorkOrder.deliveredAt = new Date();
    }

    return this.deliveryWorkOrderRepository.save(deliveryWorkOrder);
  }

  async assignDriver(id: number, driverId: string): Promise<DeliveryWorkOrder> {
    const deliveryWorkOrder = await this.findOne(id);
    deliveryWorkOrder.driverId = driverId;
    return this.deliveryWorkOrderRepository.save(deliveryWorkOrder);
  }

  async markReady(id: number): Promise<DeliveryWorkOrder> {
    return this.updateStatus(id, DeliveryWorkOrderStatus.READY);
  }

  async startDelivery(id: number): Promise<DeliveryWorkOrder> {
    return this.updateStatus(id, DeliveryWorkOrderStatus.IN_TRANSIT);
  }

  async markDelivered(id: number): Promise<DeliveryWorkOrder> {
    return this.updateStatus(id, DeliveryWorkOrderStatus.DELIVERED);
  }

  async remove(id: number): Promise<void> {
    const deliveryWorkOrder = await this.findOne(id);
    await this.deliveryWorkOrderRepository.remove(deliveryWorkOrder);
  }
}
