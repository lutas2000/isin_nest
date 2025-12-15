import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmConfig } from './entities/crm-config.entity';

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

  async findAll(): Promise<CrmConfig[]> {
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

