import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  LegacyContext,
  LegacyController,
  LegacyRead,
  LegacyRequestContext,
} from '../common/legacy-access';
import { LegacyReportsService } from './reports.service';

/**
 * 舊版報表：目錄與預覽（回傳形狀同 isin_vb6 /api/reports）。
 * 篩選條件依報表目錄的 filters（date_from、customer_from…）；驗證在 service（與舊版相同訊息）。
 */
@ApiTags('舊版銷管：報表')
@LegacyController()
@Controller('legacy-crm/reports')
export class LegacyReportsController {
  constructor(private readonly reports: LegacyReportsService) {}

  @ApiOperation({ summary: '報表目錄（可依群組篩選）' })
  @LegacyRead()
  @Get('catalog')
  catalog(@Query('group') group: unknown) {
    const first = Array.isArray(group) ? group[0] : group;
    return {
      items: this.reports.catalog(typeof first === 'string' ? first : ''),
    };
  }

  @ApiOperation({ summary: '報表預覽（最多 5,000 列），並記錄查詢條件' })
  @LegacyRead()
  @Get(':key/preview')
  preview(
    @Param('key') key: string,
    @Query() query: Record<string, unknown>,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return this.reports.preview(key, query ?? {}, context);
  }
}
