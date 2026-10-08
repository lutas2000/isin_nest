import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { LegacyBrowseController } from './browse/browse.controller';
import { LegacyBrowseService } from './browse/browse.service';
import {
  LegacyGroupsController,
  LegacyOrdersController,
  LegacyQuotesController,
  LegacyReceiptCandidatesController,
  LegacyReceiptsController,
  LegacySalesController,
  LegacyWorksController,
} from './documents/documents.controller';
import { LegacyGroupsService } from './documents/groups.service';
import { LegacyOrdersService } from './documents/orders.service';
import { LegacyQuotesService } from './documents/quotes.service';
import { LegacyReceiptsService } from './documents/receipts.service';
import { LegacySalesService } from './documents/sales.service';
import { LegacyWorksService } from './documents/works.service';
import { LEGACY_CRM_ENTITIES } from './entities';
import {
  LegacyBanksController,
  LegacyMaterialsController,
  LegacyPartsController,
  LegacyPhrasesController,
  LegacyPostalCodesController,
} from './masters/masters.controller';
import { LegacyMastersService } from './masters/masters.service';
import { LegacyPartnersController } from './partners/partners.controller';
import { LegacyPartnersService } from './partners/partners.service';
import { LegacyDrawingsController } from './drawings/drawings.controller';
import { LegacyDrawingsService } from './drawings/drawings.service';
import { LegacyFileService } from './drawings/legacy-file.service';
import { LegacyReportsController } from './reports/reports.controller';
import { LegacyReportsService } from './reports/reports.service';
import { LegacyPrintLogController } from './print-log/print-log.controller';
import { LegacyPrintLogService } from './print-log/print-log.service';
import { LegacyWriteLogService } from './write-log/write-log.service';
import { LegacyLogsController } from './log-query/logs.controller';
import { LegacyLogsService } from './log-query/logs.service';

/**
 * 舊版銷管（isin_vb6 遷入）。資料在 PostgreSQL 的 legacy_crm schema；
 * API 前綴 /legacy-crm（前端經 /api 代理），權限為 `crm` 功能。規劃見 docs/LEGACY-CRM-REBUILD-PLAN.md。
 */
@Module({
  imports: [TypeOrmModule.forFeature(LEGACY_CRM_ENTITIES), AuthModule],
  controllers: [
    LegacyPartnersController,
    LegacyMaterialsController,
    LegacyPartsController,
    LegacyBanksController,
    LegacyPhrasesController,
    LegacyPostalCodesController,
    LegacyOrdersController,
    LegacySalesController,
    LegacyQuotesController,
    LegacyWorksController,
    LegacyReceiptsController,
    LegacyReceiptCandidatesController,
    LegacyGroupsController,
    LegacyBrowseController,
    LegacyPrintLogController,
    LegacyReportsController,
    LegacyDrawingsController,
    LegacyLogsController,
  ],
  providers: [
    LegacyWriteLogService,
    LegacyPrintLogService,
    LegacyPartnersService,
    LegacyMastersService,
    LegacyOrdersService,
    LegacySalesService,
    LegacyQuotesService,
    LegacyWorksService,
    LegacyReceiptsService,
    LegacyGroupsService,
    LegacyBrowseService,
    LegacyReportsService,
    LegacyFileService,
    LegacyDrawingsService,
    LegacyLogsService,
  ],
  exports: [TypeOrmModule, LegacyPrintLogService, LegacyWorksService],
})
export class LegacyCrmModule {
  constructor(works: LegacyWorksService, drawings: LegacyDrawingsService) {
    // 工作登錄存檔前的 CNC 檔檢查（舊版「工作登錄檢查」）；未設定 LEGACY_CNC_PATH 時不檢查。
    works.useCncCheck((items) => drawings.missingCncFiles(items));
  }
}
