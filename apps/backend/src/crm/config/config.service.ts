import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmConfig } from './entities/crm-config.entity';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

const DEFAULT_CONFIGS: Record<string, Array<{ code: string; label: string }>> = {
  shipping_method: [
    { code: 'PICKUP', label: '自取' },
    { code: 'EXPRESS', label: '快遞' },
    { code: 'FREIGHT', label: '貨運' },
  ],
  payment_method: [
    { code: 'CASH', label: '現金' },
    { code: 'TRANSFER', label: '轉帳' },
    { code: 'MONTHLY', label: '月結' },
  ],
  source_type: [
    { code: 'NEW', label: '新圖' },
    { code: 'OLD', label: '舊圖' },
    { code: 'MODIFIED', label: '修改' },
  ],
};

@Injectable()
export class CrmConfigService implements OnModuleInit {
  constructor(
    @InjectRepository(CrmConfig)
    private readonly crmConfigRepository: Repository<CrmConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncDefaults();
  }

  async findAll(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<CrmConfig>> {
    // 使用預設值：page=1, limit=50
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;

    // 限制最大每頁筆數
    const maxLimit = Math.min(limitNum, 100);
    const skip = (pageNum - 1) * maxLimit;

    const [data, total] = await this.crmConfigRepository.findAndCount({
      order: {
        category: 'ASC',
        displayOrder: 'ASC',
        code: 'ASC',
      },
      take: maxLimit,
      skip: skip,
    });

    return new PaginatedResponseDto(data, total, pageNum, maxLimit);
  }

  async findAllWithoutPagination(): Promise<CrmConfig[]> {
    return this.crmConfigRepository.find({
      order: {
        category: 'ASC',
        displayOrder: 'ASC',
        code: 'ASC',
      },
    });
  }

  async findByCategory(category: string): Promise<CrmConfig[]> {
    return this.crmConfigRepository.find({
      where: { category },
      order: {
        displayOrder: 'ASC',
        code: 'ASC',
      },
    });
  }

  async create(createDto: { category: string; code: string; label: string; displayOrder?: number }): Promise<CrmConfig> {
    // 檢查是否已存在
    const existing = await this.crmConfigRepository.findOne({
      where: { category: createDto.category, code: createDto.code },
    });

    if (existing) {
      throw new Error('該分類和代碼的設定已存在');
    }

    const config = this.crmConfigRepository.create({
      category: createDto.category,
      code: createDto.code,
      label: createDto.label,
      displayOrder: createDto.displayOrder ?? 0,
    });

    return this.crmConfigRepository.save(config);
  }

  async update(id: number, updateDto: { category?: string; code?: string; label?: string; displayOrder?: number }): Promise<CrmConfig> {
    const config = await this.crmConfigRepository.findOne({ where: { id } });

    if (!config) {
      throw new Error('設定不存在');
    }

    // 如果要更新 category 或 code，檢查是否會造成重複
    if (updateDto.category || updateDto.code) {
      const newCategory = updateDto.category ?? config.category;
      const newCode = updateDto.code ?? config.code;

      if (newCategory !== config.category || newCode !== config.code) {
        const existing = await this.crmConfigRepository.findOne({
          where: { category: newCategory, code: newCode },
        });

        if (existing && existing.id !== id) {
          throw new Error('該分類和代碼的設定已存在');
        }
      }
    }

    if (updateDto.category !== undefined) config.category = updateDto.category;
    if (updateDto.code !== undefined) config.code = updateDto.code;
    if (updateDto.label !== undefined) config.label = updateDto.label;
    if (updateDto.displayOrder !== undefined) config.displayOrder = updateDto.displayOrder;

    return this.crmConfigRepository.save(config);
  }

  async remove(id: number): Promise<{ message: string }> {
    const config = await this.crmConfigRepository.findOne({ where: { id } });

    if (!config) {
      throw new Error('設定不存在');
    }

    await this.crmConfigRepository.remove(config);
    return { message: '設定已刪除' };
  }

  async syncDefaults(): Promise<void> {
    // 先把資料表中已有的設定全部查出來，避免使用 upsert 時因為沒有 id 而觸發 TypeORM 的錯誤
    const existing = await this.crmConfigRepository.find();
    const existingMap = new Map<string, CrmConfig>();

    existing.forEach((item) => {
      const key = `${item.category}:${item.code}`;
      existingMap.set(key, item);
    });

    const rowsToSave: CrmConfig[] = [];

    Object.entries(DEFAULT_CONFIGS).forEach(([category, values]) => {
      values.forEach((value, index) => {
        const key = `${category}:${value.code}`;
        const entity =
          existingMap.get(key) ??
          this.crmConfigRepository.create({
            category,
            code: value.code,
          });

        entity.label = value.label;
        entity.displayOrder = index;

        rowsToSave.push(entity);
      });
    });

    if (rowsToSave.length > 0) {
      // TypeORM 的 save 會自動根據是否有主鍵來決定是 INSERT 還是 UPDATE
      await this.crmConfigRepository.save(rowsToSave);
    }
  }
}

