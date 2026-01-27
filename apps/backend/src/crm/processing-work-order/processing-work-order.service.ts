import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessingWorkOrder } from './entities/processing-work-order.entity';
import { ProcessingWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class ProcessingWorkOrderService {
  constructor(
    @InjectRepository(ProcessingWorkOrder)
    private processingWorkOrderRepository: Repository<ProcessingWorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<ProcessingWorkOrder>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.processingWorkOrderRepository.findAndCount({
      relations: ['order', 'orderItem', 'assignedStaff'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<ProcessingWorkOrder[]> {
    return this.processingWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'orderItem', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: ProcessingWorkOrderStatus): Promise<ProcessingWorkOrder[]> {
    return this.processingWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'orderItem', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.processingWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'orderItem', 'assignedStaff'],
    });

    if (!processingWorkOrder) {
      throw new NotFoundException(`加工工作單 ID ${id} 不存在`);
    }

    return processingWorkOrder;
  }

  async create(data: Partial<ProcessingWorkOrder>): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = this.processingWorkOrderRepository.create({
      ...data,
      status: data.status || ProcessingWorkOrderStatus.PENDING,
    });
    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  async update(id: number, data: Partial<ProcessingWorkOrder>): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.findOne(id);
    Object.assign(processingWorkOrder, data);
    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  async updateStatus(id: number, status: ProcessingWorkOrderStatus): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.findOne(id);
    processingWorkOrder.status = status;

    if (status === ProcessingWorkOrderStatus.COMPLETED && !processingWorkOrder.completedAt) {
      processingWorkOrder.completedAt = new Date();
    }

    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  async assign(id: number, staffId: string): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.findOne(id);
    processingWorkOrder.assignedStaffId = staffId;
    if (processingWorkOrder.status === ProcessingWorkOrderStatus.PENDING) {
      processingWorkOrder.status = ProcessingWorkOrderStatus.IN_PROGRESS;
    }
    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  async remove(id: number): Promise<void> {
    const processingWorkOrder = await this.findOne(id);
    await this.processingWorkOrderRepository.remove(processingWorkOrder);
  }
}
