import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class OrderItemService {
  constructor(
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<OrderItem[] | PaginatedResponseDto<OrderItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.orderItemRepository.findAndCount({
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  findOne(id: number): Promise<OrderItem | null> {
    return this.orderItemRepository.findOne({
      where: { id },
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
    });
  }

  async findByOrderId(
    orderId: string,
    page?: number,
    limit?: number,
  ): Promise<OrderItem[] | PaginatedResponseDto<OrderItem>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.orderItemRepository.findAndCount({
      where: { orderId },
      relations: ['order', 'drawingStaff', 'processingItems', 'processingItems.vendor'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async create(orderItem: Partial<OrderItem>): Promise<OrderItem> {
    const newOrderItem = this.orderItemRepository.create({
      ...orderItem,
    });
    return this.orderItemRepository.save(newOrderItem);
  }

  async createMany(orderItems: Partial<OrderItem>[]): Promise<OrderItem[]> {
    const newOrderItems = orderItems.map(item => 
      this.orderItemRepository.create({
        ...item,
      })
    );
    return this.orderItemRepository.save(newOrderItems);
  }

  async remove(id: number): Promise<void> {
    await this.orderItemRepository.delete(id);
  }

  async update(id: number, orderItem: Partial<OrderItem>): Promise<OrderItem | null> {
    const existingOrderItem = await this.orderItemRepository.findOneBy({ id });
    if (existingOrderItem) {
      Object.assign(existingOrderItem, orderItem);
      return this.orderItemRepository.save(existingOrderItem);
    }
    return null;
  }

  async updateNestingStatus(id: number, nestingId: number | null, isNested: boolean): Promise<OrderItem | null> {
    const orderItem = await this.findOne(id);
    if (orderItem) {
      orderItem.nestingId = nestingId;
      return this.orderItemRepository.save(orderItem);
    }
    return null;
  }

  async getDxfPreview(id: number): Promise<{ orderItemId: number; fileName: string; extension: 'dxf'; content: string }> {
    const orderItem = await this.orderItemRepository.findOne({
      where: { id },
    });

    if (!orderItem) {
      throw new NotFoundException(`訂單工件 ID ${id} 不存在`);
    }

    const cadFile = orderItem.cadFile?.trim();
    if (!cadFile) {
      throw new NotFoundException(`訂單工件 ID ${id} 沒有 cadFile，無法預覽 DXF`);
    }

    const dwgPath = process.env.DWG_PATH;
    if (!dwgPath) {
      throw new NotFoundException('DWG_PATH 未設定');
    }

    // 假設 DXF 檔名與 cadFile 主檔名相同，依照 CNC 類似規則分層
    const baseName = cadFile.replace(/\.[^/.]+$/, '');
    const { join: pathJoin } = await import('path');
    const { access, readFile } = await import('fs/promises');

    const basePath = pathJoin(
      dwgPath,
      baseName.slice(0, 1),
      baseName.slice(0, 3),
      baseName,
    );

    const fileCandidates: Array<{ path: string; extension: 'dxf' }> = [
      { path: `${basePath}.dxf`, extension: 'dxf' },
      { path: `${basePath}.DXF`, extension: 'dxf' },
    ];

    let selectedFile: { path: string; extension: 'dxf' } | null = null;
    for (const candidate of fileCandidates) {
      try {
        await access(candidate.path);
        selectedFile = candidate;
        break;
      } catch {
        // 繼續嘗試下一個
      }
    }

    if (!selectedFile) {
      throw new NotFoundException(`找不到 cadFile ${cadFile} 對應的 DXF 檔案`);
    }

    const content = await readFile(selectedFile.path, 'utf8');

    return {
      orderItemId: id,
      fileName: `${baseName}.dxf`,
      extension: 'dxf',
      content,
    };
  }
}
