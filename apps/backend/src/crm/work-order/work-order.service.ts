import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity';

@Injectable()
export class WorkOrderService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrderRepository: Repository<WorkOrder>,
  ) {}

  findAll(): Promise<WorkOrder[]> {
    return this.workOrderRepository.find({
      relations: ['staff', 'customer', 'workOrderItems'],
    });
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

