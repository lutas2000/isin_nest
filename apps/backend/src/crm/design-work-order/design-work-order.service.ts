import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignWorkOrder } from './entities/design-work-order.entity';
import { DesignWorkOrderStatus } from '../enums/work-order-status.enum';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { join as pathJoin } from 'path';
import { promises as fs } from 'fs';

export interface DesignWorkOrderCncPreview {
  drawingNumber: string;
  fileName: string;
  extension: 'nc' | 'cnc';
  content: string;
  width: number | null;
  height: number | null;
}

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

  async getCncPreview(id: number): Promise<DesignWorkOrderCncPreview> {
    const designWorkOrder = await this.findOne(id);
    const drawingNumber = designWorkOrder.drawingNumber?.trim();
    if (!drawingNumber) {
      throw new NotFoundException(`設計工作單 ID ${id} 沒有圖號，無法預覽 CNC`);
    }

    const cncPath = process.env.CNC_PATH;
    if (!cncPath) {
      throw new NotFoundException('CNC_PATH 未設定');
    }

    const basePath = pathJoin(
      cncPath,
      drawingNumber.slice(0, 1),
      drawingNumber.slice(0, 3),
      drawingNumber,
    );
    const fileCandidates: Array<{ path: string; extension: 'nc' | 'cnc' }> = [
      { path: `${basePath}.NC`, extension: 'nc' },
      { path: `${basePath}.CNC`, extension: 'cnc' },
    ];

    let selectedFile: { path: string; extension: 'nc' | 'cnc' } | null = null;
    for (const candidate of fileCandidates) {
      try {
        await fs.access(candidate.path);
        selectedFile = candidate;
        break;
      } catch {
        // Try next candidate extension.
      }
    }

    if (!selectedFile) {
      throw new NotFoundException(
        `找不到圖號 ${drawingNumber}`,
      );
    }

    const content = await fs.readFile(selectedFile.path, 'utf8');
    const bounds = this.calculateXYBounds(content);

    return {
      drawingNumber,
      fileName: `${drawingNumber}.${selectedFile.extension}`,
      extension: selectedFile.extension,
      content,
      width: bounds.width,
      height: bounds.height,
    };
  }

  private calculateXYBounds(content: string): { width: number | null; height: number | null } {
    const lines = content.split(/\r?\n/);
    let minX: number | null = null;
    let maxX: number | null = null;
    let minY: number | null = null;
    let maxY: number | null = null;

    for (const line of lines) {
      const commandPart = line.split(';')[0];
      const xMatch = commandPart.match(/(?:^|\s)X\s*(-?\d+(?:\.\d+)?)/i);
      const yMatch = commandPart.match(/(?:^|\s)Y\s*(-?\d+(?:\.\d+)?)/i);
      if (xMatch) {
        const x = Number(xMatch[1]);
        if (!Number.isNaN(x)) {
          minX = minX === null ? x : Math.min(minX, x);
          maxX = maxX === null ? x : Math.max(maxX, x);
        }
      }
      if (yMatch) {
        const y = Number(yMatch[1]);
        if (!Number.isNaN(y)) {
          minY = minY === null ? y : Math.min(minY, y);
          maxY = maxY === null ? y : Math.max(maxY, y);
        }
      }
    }

    return {
      width: minX !== null && maxX !== null ? maxX - minX : null,
      height: minY !== null && maxY !== null ? maxY - minY : null,
    };
  }
}
