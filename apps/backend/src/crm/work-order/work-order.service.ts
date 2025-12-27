import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class WorkOrderService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrderRepository: Repository<WorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<WorkOrder[] | PaginatedResponseDto<WorkOrder>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.workOrderRepository.findAndCount({
      relations: ['staff', 'customer', 'workOrderItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: string): Promise<WorkOrder | null> {
    return this.workOrderRepository.findOne({
      where: { id },
      relations: ['staff', 'customer', 'workOrderItems'],
    });
  }

  async create(workOrder: Partial<WorkOrder>): Promise<WorkOrder> {
    const newWorkOrder = this.workOrderRepository.create(workOrder);
    return this.workOrderRepository.save(newWorkOrder);
  }

  async remove(id: string): Promise<void> {
    await this.workOrderRepository.delete(id);
  }

  async update(id: string, workOrder: Partial<WorkOrder>): Promise<WorkOrder | null> {
    const existingWorkOrder = await this.workOrderRepository.findOneBy({ id });
    if (existingWorkOrder) {
      Object.assign(existingWorkOrder, workOrder);
      return this.workOrderRepository.save(existingWorkOrder);
    }
    return null;
  }

  async complete(id: string): Promise<WorkOrder | null> {
    const workOrder = await this.findOne(id);
    if (workOrder) {
      workOrder.isCompleted = true;
      workOrder.endedAt = new Date();
      return this.workOrderRepository.save(workOrder);
    }
    return null;
  }
}

