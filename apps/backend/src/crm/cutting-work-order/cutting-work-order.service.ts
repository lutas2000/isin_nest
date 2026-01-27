import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuttingWorkOrder } from './entities/cutting-work-order.entity';
import { CuttingWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class CuttingWorkOrderService {
  constructor(
    @InjectRepository(CuttingWorkOrder)
    private cuttingWorkOrderRepository: Repository<CuttingWorkOrder>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<CuttingWorkOrder>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.cuttingWorkOrderRepository.findAndCount({
      relations: ['order', 'assignedStaff'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<CuttingWorkOrder[]> {
    return this.cuttingWorkOrderRepository.find({
      where: { orderId },
      relations: ['order', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: CuttingWorkOrderStatus): Promise<CuttingWorkOrder[]> {
    return this.cuttingWorkOrderRepository.find({
      where: { status },
      relations: ['order', 'assignedStaff'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<CuttingWorkOrder> {
    const cuttingWorkOrder = await this.cuttingWorkOrderRepository.findOne({
      where: { id },
      relations: ['order', 'assignedStaff'],
    });

    if (!cuttingWorkOrder) {
      throw new NotFoundException(`切割工作單 ID ${id} 不存在`);
    }

    return cuttingWorkOrder;
  }

  async create(data: Partial<CuttingWorkOrder>): Promise<CuttingWorkOrder> {
    const cuttingWorkOrder = this.cuttingWorkOrderRepository.create({
      ...data,
      status: data.status || CuttingWorkOrderStatus.PENDING,
    });
    return this.cuttingWorkOrderRepository.save(cuttingWorkOrder);
  }

  async update(id: number, data: Partial<CuttingWorkOrder>): Promise<CuttingWorkOrder> {
    const cuttingWorkOrder = await this.findOne(id);
    Object.assign(cuttingWorkOrder, data);
    return this.cuttingWorkOrderRepository.save(cuttingWorkOrder);
  }

  async updateStatus(id: number, status: CuttingWorkOrderStatus): Promise<CuttingWorkOrder> {
    const cuttingWorkOrder = await this.findOne(id);
    cuttingWorkOrder.status = status;

    if (status === CuttingWorkOrderStatus.COMPLETED && !cuttingWorkOrder.completedAt) {
      cuttingWorkOrder.completedAt = new Date();
    }

    return this.cuttingWorkOrderRepository.save(cuttingWorkOrder);
  }

  async assign(id: number, staffId: string, machineId?: string): Promise<CuttingWorkOrder> {
    const cuttingWorkOrder = await this.findOne(id);
    cuttingWorkOrder.assignedStaffId = staffId;
    if (machineId) {
      cuttingWorkOrder.machineId = machineId;
    }
    if (cuttingWorkOrder.status === CuttingWorkOrderStatus.PENDING) {
      cuttingWorkOrder.status = CuttingWorkOrderStatus.ASSIGNED;
    }
    return this.cuttingWorkOrderRepository.save(cuttingWorkOrder);
  }

  async remove(id: number): Promise<void> {
    const cuttingWorkOrder = await this.findOne(id);
    await this.cuttingWorkOrderRepository.remove(cuttingWorkOrder);
  }
}
