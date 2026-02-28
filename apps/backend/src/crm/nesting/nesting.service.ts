import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Nesting } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import * as mammoth from 'mammoth';
import { randomUUID } from 'crypto';

@Injectable()
export class NestingService {
  constructor(
    @InjectRepository(Nesting)
    private nestingRepository: Repository<Nesting>,
    @InjectRepository(NestingItem)
    private nestingItemRepository: Repository<NestingItem>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<Nesting>> {
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.nestingRepository.findAndCount({
      relations: ['order', 'designWorkOrder', 'nestingItems'],
      order: { createdAt: 'DESC' },
      take: maxLimit,
      skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findByOrderId(orderId: string): Promise<Nesting[]> {
    return this.nestingRepository.find({
      where: { orderId },
      relations: ['order', 'designWorkOrder', 'nestingItems'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Nesting> {
    const nesting = await this.nestingRepository.findOne({
      where: { id },
      relations: ['order', 'designWorkOrder', 'nestingItems'],
    });

    if (!nesting) {
      throw new NotFoundException(`排版 ID ${id} 不存在`);
    }

    return nesting;
  }

  async create(data: Partial<Nesting>): Promise<Nesting> {
    // 如果沒有提供排版 ID，根據訂單 ID 產生排版圖號；否則使用既有 ID
    const id =
      data.id ||
      (data.orderId ? await this.generateNestingNumber(data.orderId) : randomUUID());

    const nesting = this.nestingRepository.create({
      ...data,
      id,
    });
    return this.nestingRepository.save(nesting);
  }

  async update(id: string, data: Partial<Nesting>): Promise<Nesting> {
    const nesting = await this.findOne(id);
    Object.assign(nesting, data);
    return this.nestingRepository.save(nesting);
  }

  async remove(id: string): Promise<void> {
    const nesting = await this.findOne(id);
    await this.nestingRepository.remove(nesting);
  }

  // 排版工件管理
  async addItem(nestingId: string, payload: Partial<NestingItem>): Promise<NestingItem> {
    const nesting = await this.findOne(nestingId); // 確認排版存在

    const nestingItem = this.nestingItemRepository.create({
      ...payload,
      id: payload.id || randomUUID(),
      nesting,
      quantity: payload.quantity ?? 1,
    });
    return this.nestingItemRepository.save(nestingItem);
  }

  async updateItem(id: string, quantity: number): Promise<NestingItem> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    nestingItem.quantity = quantity;
    return this.nestingItemRepository.save(nestingItem);
  }

  async removeItem(id: string): Promise<void> {
    const nestingItem = await this.nestingItemRepository.findOneBy({ id });
    if (!nestingItem) {
      throw new NotFoundException(`排版工件 ID ${id} 不存在`);
    }
    await this.nestingItemRepository.remove(nestingItem);
  }

  async importFromDocx(
    file: any,
    meta: { orderId: string; material: string; thickness: string },
  ): Promise<Nesting> {
    if (!file || !file.buffer) {
      throw new NotFoundException('未收到上傳的 DOCX 檔案');
    }

    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = result.value || '';

    const {
      nestingData,
      items,
    } = this.parseDocxToNestingData(text);

    const id = await this.generateNestingNumber(meta.orderId);

    const nesting = this.nestingRepository.create({
      id,
      ...nestingData,
      orderId: meta.orderId,
      material: meta.material,
      thickness: meta.thickness,
    });
    const savedNesting = await this.nestingRepository.save(nesting);

    if (items.length > 0) {
      const nestingItems = items.map((item) =>
        this.nestingItemRepository.create({
          id: randomUUID(),
          nesting: savedNesting,
          quantity: item.quantity ?? 1,
          processingTime: item.processingTime,
          x: item.x,
          y: item.y,
        }),
      );
      await this.nestingItemRepository.save(nestingItems);
      savedNesting.nestingItems = nestingItems;
    }

    return savedNesting;
  }

  private parseDocxToNestingData(text: string): {
    nestingData: Partial<Nesting>;
    items: Array<{
      processingTime?: number;
      x?: number;
      y?: number;
      quantity?: number;
    }>;
  } {
    const clean = text.replace(/\r/g, '');
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

    const asNumber = (value?: string | null): number | undefined => {
      if (!value) return undefined;
      const num = Number(value.replace(/[, ]/g, ''));
      return Number.isNaN(num) ? undefined : num;
    };

    const timeToSeconds = (value?: string | null): number | undefined => {
      if (!value) return undefined;
      const match = value.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (!match) return undefined;
      const [, h, m, s] = match;
      return Number(h) * 3600 + Number(m) * 60 + Number(s);
    };

    const findMatch = (regex: RegExp): RegExpExecArray | null => {
      for (const line of lines) {
        const m = regex.exec(line);
        if (m) return m;
      }
      return null;
    };

    const cutMatch = findMatch(/切削長度[:：]?\s*([\d.,]+)/);
    const lineMatch = findMatch(/劃線長度[:：]?\s*([\d.,]+)/);
    const processMatch = findMatch(/加工時\s*([0-9:]+)/);
    const utilMatch = findMatch(/使用率\(%\)\s*([\d.]+)/);
    const weightMatch = findMatch(/重量\s*([\d.]+)/);
    const scrapMatch = findMatch(/廢料\(%\)\s*([\d.]+)/);

    const xMatch = findMatch(/X\s*([\d.,]+)/);
    const yMatch = findMatch(/Y\s*([\d.,]+)/);

    const nestingData: Partial<Nesting> = {
      x: asNumber(xMatch?.[1]),
      y: asNumber(yMatch?.[1]),
      cutLength: asNumber(cutMatch?.[1]),
      lineLength: asNumber(lineMatch?.[1]),
      processingTime: timeToSeconds(processMatch?.[1]),
      utilization: asNumber(utilMatch?.[1]),
      weight: asNumber(weightMatch?.[1]),
      scrap: asNumber(scrapMatch?.[1]),
    };

    const itemRows: Array<{
      processingTime?: number;
      x?: number;
      y?: number;
      quantity?: number;
    }> = [];

    const rowRegex =
      /^(\d+)\s+\S+\.DFT\s+(\d{1,2}:\d{2}:\d{2})\s+(\d+)\s+([\d.]+)\s+([\d.]+)/i;

    for (const line of lines) {
      const m = rowRegex.exec(line);
      if (!m) continue;
      const processingTime = timeToSeconds(m[2]);
      const quantity = asNumber(m[3]);
      const x = asNumber(m[4]);
      const y = asNumber(m[5]);
      itemRows.push({
        processingTime,
        quantity,
        x,
        y,
      });
    }

    return {
      nestingData,
      items: itemRows,
    };
  }

  // 生成排版圖號
  // 格式：前三碼客戶型號 + 年份代號 + 月份 + 日期 + 流水號 + 版次
  private async generateNestingNumber(orderId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // 取年份後兩位
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // 取訂單ID前三碼作為客戶型號前綴
    const prefix = orderId.slice(0, 3).toUpperCase();
    const dateCode = `${year}${month}${day}`;
    
    // 查找今天已經建立的排版數量
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const todayCount = await this.nestingRepository
      .createQueryBuilder('nesting')
      .where('nesting.created_at >= :startOfDay', { startOfDay })
      .andWhere('nesting.created_at < :endOfDay', { endOfDay })
      .getCount();
    
    // 流水號（A, B, C... 或 01, 02, 03...）
    const sequence = String.fromCharCode(65 + todayCount); // A, B, C...
    const version = '01'; // 版次
    
    return `${prefix}${dateCode}${sequence}${version}`;
  }
}

