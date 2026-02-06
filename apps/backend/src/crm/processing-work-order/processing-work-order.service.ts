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
      relations: ['order', 'orderItem', 'processing', 'processing.vendor', 'assignedStaff'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<ProcessingWorkOrder[]> {
    return this.processingWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'orderItem', 'processing', 'processing.vendor', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOrderItemId(orderItemId: number): Promise<ProcessingWorkOrder[]> {
    return this.processingWorkOrderRepository.find({
      where: { orderItemId },
      relations: ['processing', 'processing.vendor', 'assignedStaff'],
      order: { createdAt: 'ASC' },
    });
  }

  async findByStatus(status: ProcessingWorkOrderStatus): Promise<ProcessingWorkOrder[]> {
    return this.processingWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'orderItem', 'processing', 'processing.vendor', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 查詢委外加工工單（有指定廠商或 Processing 有預設廠商的）
   */
  async findOutsourcedWorkOrders(): Promise<ProcessingWorkOrder[]> {
    const workOrders = await this.processingWorkOrderRepository.find({
      relations: ['order', 'orderItem', 'processing', 'processing.vendor', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });

    // 篩選有廠商的工單（Processing 預設的 vendor）
    return workOrders.filter((wo) => wo.processing?.vendor);
  }

  async findOne(id: number): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.processingWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'orderItem', 'processing', 'processing.vendor', 'assignedStaff'],
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

  /**
   * 記錄送出日期（委外加工）
   */
  async ship(id: number): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.findOne(id);
    processingWorkOrder.shippedAt = new Date();
    if (processingWorkOrder.status === ProcessingWorkOrderStatus.PENDING) {
      processingWorkOrder.status = ProcessingWorkOrderStatus.IN_PROGRESS;
    }
    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  /**
   * 記錄取回日期（委外加工）
   */
  async return(id: number): Promise<ProcessingWorkOrder> {
    const processingWorkOrder = await this.findOne(id);
    processingWorkOrder.returnedAt = new Date();
    processingWorkOrder.status = ProcessingWorkOrderStatus.COMPLETED;
    processingWorkOrder.completedAt = new Date();
    return this.processingWorkOrderRepository.save(processingWorkOrder);
  }

  async remove(id: number): Promise<void> {
    const processingWorkOrder = await this.findOne(id);
    await this.processingWorkOrderRepository.remove(processingWorkOrder);
  }
}
