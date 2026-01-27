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
      relations: ['outsourcingWorkOrder', 'outsourcingWorkOrder.vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOutsourcingWorkOrderId(outsourcingWorkOrderId: number): Promise<OutsourcingCost[]> {
    return this.outsourcingCostRepository.find({
      where: { outsourcingWorkOrderId },
      relations: ['outsourcingWorkOrder'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<OutsourcingCost> {
    const outsourcingCost = await this.outsourcingCostRepository.findOne({
      where: { id },
      relations: ['outsourcingWorkOrder', 'outsourcingWorkOrder.vendor'],
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

  // 計算某個委外工作單的總成本
  async getTotalCostByWorkOrder(outsourcingWorkOrderId: number): Promise<number> {
    const costs = await this.findByOutsourcingWorkOrderId(outsourcingWorkOrderId);
    return costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  }
}
