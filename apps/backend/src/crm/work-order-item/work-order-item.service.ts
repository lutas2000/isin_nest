import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrderItem } from './entities/work-order-item.entity';

@Injectable()
export class WorkOrderItemService {
  constructor(
    @InjectRepository(WorkOrderItem)
    private workOrderItemRepository: Repository<WorkOrderItem>,
  ) {}

  findAll(): Promise<WorkOrderItem[]> {
    return this.workOrderItemRepository.find({
      relations: ['workOrder', 'drawingStaff'],
    });
  }

  findOne(id: number): Promise<WorkOrderItem | null> {
    return this.workOrderItemRepository.findOne({
      where: { id },
      relations: ['workOrder', 'drawingStaff'],
    });
  }

  findByWorkOrderId(workOrderId: string): Promise<WorkOrderItem[]> {
    return this.workOrderItemRepository.find({
      where: { workOrderId },
      relations: ['workOrder', 'drawingStaff'],
    });
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

