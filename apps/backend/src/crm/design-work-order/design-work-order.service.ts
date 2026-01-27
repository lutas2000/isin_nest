import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignWorkOrder } from './entities/design-work-order.entity';
import { DesignWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class DesignWorkOrderService {
  constructor(
    @InjectRepository(DesignWorkOrder)
    private designWorkOrderRepository: Repository<DesignWorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<DesignWorkOrder>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.designWorkOrderRepository.findAndCount({
      relations: ['order', 'orderItem', 'assignedStaff', 'supervisorStaff'],
      order: { priority: 'DESC', createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<DesignWorkOrder[]> {
    return this.designWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'orderItem', 'assignedStaff', 'supervisorStaff'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByStatus(status: DesignWorkOrderStatus): Promise<DesignWorkOrder[]> {
    return this.designWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'orderItem', 'assignedStaff', 'supervisorStaff'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<DesignWorkOrder> {
    const designWorkOrder = await this.designWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'orderItem', 'assignedStaff', 'supervisorStaff'],
    });

    if (!designWorkOrder) {
      throw new NotFoundException(`設計工作單 ID ${id} 不存在`);
    }

    return designWorkOrder;
  }

  async create(data: Partial<DesignWorkOrder>): Promise<DesignWorkOrder> {
    const designWorkOrder = this.designWorkOrderRepository.create({
      ...data,
      status: data.status || DesignWorkOrderStatus.PENDING,
    });
    return this.designWorkOrderRepository.save(designWorkOrder);
  }

  async update(id: number, data: Partial<DesignWorkOrder>): Promise<DesignWorkOrder> {
    const designWorkOrder = await this.findOne(id);
    Object.assign(designWorkOrder, data);
    return this.designWorkOrderRepository.save(designWorkOrder);
  }

  async updateStatus(id: number, status: DesignWorkOrderStatus): Promise<DesignWorkOrder> {
    const designWorkOrder = await this.findOne(id);
    designWorkOrder.status = status;

    if (status === DesignWorkOrderStatus.COMPLETED && !designWorkOrder.completedAt) {
      designWorkOrder.completedAt = new Date();
    }

    return this.designWorkOrderRepository.save(designWorkOrder);
  }

  async assign(id: number, staffId: string): Promise<DesignWorkOrder> {
    const designWorkOrder = await this.findOne(id);
    designWorkOrder.assignedStaffId = staffId;
    if (designWorkOrder.status === DesignWorkOrderStatus.PENDING) {
      designWorkOrder.status = DesignWorkOrderStatus.IN_PROGRESS;
    }
    return this.designWorkOrderRepository.save(designWorkOrder);
  }

  async remove(id: number): Promise<void> {
    const designWorkOrder = await this.findOne(id);
    await this.designWorkOrderRepository.remove(designWorkOrder);
  }
}
