import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LEGACY_CRM_ENTITIES } from './entities';

/**
 * 舊版銷管（isin_vb6 遷入）。資料在 PostgreSQL 的 legacy_crm schema；
 * 規劃見 docs/LEGACY-CRM-REBUILD-PLAN.md。目前只有資料層，API 於第 2 階段加入。
 */
@Module({
  imports: [TypeOrmModule.forFeature(LEGACY_CRM_ENTITIES)],
  exports: [TypeOrmModule],
})
export class LegacyCrmModule {}
