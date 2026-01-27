import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutsourcingWorkOrder } from './entities/outsourcing-work-order.entity';
import { OutsourcingWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OutsourcingWorkOrderService {
  constructor(
    @InjectRepository(OutsourcingWorkOrder)
    private outsourcingWorkOrderRepository: Repository<OutsourcingWorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<OutsourcingWorkOrder>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.outsourcingWorkOrderRepository.findAndCount({
      relations: ['order', 'orderItem', 'vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<OutsourcingWorkOrder[]> {
    return this.outsourcingWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'orderItem', 'vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByVendorId(vendorId: number): Promise<OutsourcingWorkOrder[]> {
    return this.outsourcingWorkOrderRepository.find({
      where: { vendorId },
      relations: ['order', 'orderItem', 'vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: OutsourcingWorkOrderStatus): Promise<OutsourcingWorkOrder[]> {
    return this.outsourcingWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'orderItem', 'vendor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<OutsourcingWorkOrder> {
    const outsourcingWorkOrder = await this.outsourcingWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'orderItem', 'vendor'],
    });

    if (!outsourcingWorkOrder) {
      throw new NotFoundException(`委外加工工作單 ID ${id} 不存在`);
    }

    return outsourcingWorkOrder;
  }

  async create(data: Partial<OutsourcingWorkOrder>): Promise<OutsourcingWorkOrder> {
    const outsourcingWorkOrder = this.outsourcingWorkOrderRepository.create({
      ...data,
      status: data.status || OutsourcingWorkOrderStatus.PENDING,
    });
    return this.outsourcingWorkOrderRepository.save(outsourcingWorkOrder);
  }

  async update(id: number, data: Partial<OutsourcingWorkOrder>): Promise<OutsourcingWorkOrder> {
    const outsourcingWorkOrder = await this.findOne(id);
    Object.assign(outsourcingWorkOrder, data);
    return this.outsourcingWorkOrderRepository.save(outsourcingWorkOrder);
  }

  async updateStatus(id: number, status: OutsourcingWorkOrderStatus): Promise<OutsourcingWorkOrder> {
    const outsourcingWorkOrder = await this.findOne(id);
    outsourcingWorkOrder.status = status;

    // 自動設定時間戳記
    if (status === OutsourcingWorkOrderStatus.SHIPPED && !outsourcingWorkOrder.shippedAt) {
      outsourcingWorkOrder.shippedAt = new Date();
    }
    if (status === OutsourcingWorkOrderStatus.RETURNED && !outsourcingWorkOrder.returnedAt) {
      outsourcingWorkOrder.returnedAt = new Date();
    }

    return this.outsourcingWorkOrderRepository.save(outsourcingWorkOrder);
  }

  async ship(id: number): Promise<OutsourcingWorkOrder> {
    return this.updateStatus(id, OutsourcingWorkOrderStatus.SHIPPED);
  }

  async markProcessing(id: number): Promise<OutsourcingWorkOrder> {
    return this.updateStatus(id, OutsourcingWorkOrderStatus.PROCESSING);
  }

  async complete(id: number): Promise<OutsourcingWorkOrder> {
    return this.updateStatus(id, OutsourcingWorkOrderStatus.COMPLETED);
  }

  async markReturned(id: number): Promise<OutsourcingWorkOrder> {
    return this.updateStatus(id, OutsourcingWorkOrderStatus.RETURNED);
  }

  async remove(id: number): Promise<void> {
    const outsourcingWorkOrder = await this.findOne(id);
    await this.outsourcingWorkOrderRepository.remove(outsourcingWorkOrder);
  }
}
