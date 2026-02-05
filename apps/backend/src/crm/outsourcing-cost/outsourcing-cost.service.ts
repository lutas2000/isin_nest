import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutsourcingCost } from './entities/outsourcing-cost.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OutsourcingCostService {
  constructor(
    @InjectRepository(OutsourcingCost)
    private outsourcingCostRepository: Repository<OutsourcingCost>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<OutsourcingCost>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.outsourcingCostRepository.findAndCount({
      relations: ['processingWorkOrder', 'processingWorkOrder.vendor', 'processingWorkOrder.processing'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByProcessingWorkOrderId(processingWorkOrderId: number): Promise<OutsourcingCost[]> {
    return this.outsourcingCostRepository.find({
      where: { processingWorkOrderId },
      relations: ['processingWorkOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<OutsourcingCost> {
    const outsourcingCost = await this.outsourcingCostRepository.findOne({
      where: { id },
      relations: ['processingWorkOrder', 'processingWorkOrder.vendor', 'processingWorkOrder.processing'],
    });

    if (!outsourcingCost) {
      throw new NotFoundException(`委外成本 ID ${id} 不存在`);
    }

    return outsourcingCost;
  }

  async create(data: Partial<OutsourcingCost>): Promise<OutsourcingCost> {
    const outsourcingCost = this.outsourcingCostRepository.create(data);
    return this.outsourcingCostRepository.save(outsourcingCost);
  }

  async update(id: number, data: Partial<OutsourcingCost>): Promise<OutsourcingCost> {
    const outsourcingCost = await this.findOne(id);
    Object.assign(outsourcingCost, data);
    return this.outsourcingCostRepository.save(outsourcingCost);
  }

  async remove(id: number): Promise<void> {
    const outsourcingCost = await this.findOne(id);
    await this.outsourcingCostRepository.remove(outsourcingCost);
  }

  // 計算某個加工工作單的總成本
  async getTotalCostByWorkOrder(processingWorkOrderId: number): Promise<number> {
    const costs = await this.findByProcessingWorkOrderId(processingWorkOrderId);
    return costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  }
}
