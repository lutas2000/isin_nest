import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrderItem } from './entities/work-order-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class WorkOrderItemService {
  constructor(
    @InjectRepository(WorkOrderItem)
    private workOrderItemRepository: Repository<WorkOrderItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<WorkOrderItem[] | PaginatedResponseDto<WorkOrderItem>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.workOrderItemRepository.findAndCount({
      relations: ['workOrder', 'drawingStaff'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<WorkOrderItem | null> {
    return this.workOrderItemRepository.findOne({
      where: { id },
      relations: ['workOrder', 'drawingStaff'],
    });
  }

  async findByWorkOrderId(
    workOrderId: string,
    page?: number,
    limit?: number,
  ): Promise<WorkOrderItem[] | PaginatedResponseDto<WorkOrderItem>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.workOrderItemRepository.findAndCount({
      where: { workOrderId },
      relations: ['workOrder', 'drawingStaff'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async create(workOrderItem: Partial<WorkOrderItem>): Promise<WorkOrderItem> {
    const newWorkOrderItem = this.workOrderItemRepository.create(workOrderItem);
    return this.workOrderItemRepository.save(newWorkOrderItem);
  }

  async remove(id: number): Promise<void> {
    await this.workOrderItemRepository.delete(id);
  }

  async update(id: number, workOrderItem: Partial<WorkOrderItem>): Promise<WorkOrderItem | null> {
    const existingWorkOrderItem = await this.workOrderItemRepository.findOneBy({ id });
    if (existingWorkOrderItem) {
      Object.assign(existingWorkOrderItem, workOrderItem);
      return this.workOrderItemRepository.save(existingWorkOrderItem);
    }
    return null;
  }
}

