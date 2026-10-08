import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegacyController, LegacyRead } from '../common/legacy-access';
import { LegacyNotFoundError } from '../common/legacy-errors';
import { LegacyBrowseService } from './browse.service';

@ApiTags('舊版銷管：瀏覽與 F1')
@LegacyController()
@Controller('legacy-crm')
export class LegacyBrowseController {
  constructor(private readonly browse: LegacyBrowseService) {}

  @ApiOperation({
    summary:
      '頭筆／上筆／下筆／尾筆（navigate）、新單號（next-number）、查詢視窗（query）',
  })
  @LegacyRead()
  @Get('documents/:type/:action')
  async documents(
    @Param('type') type: string,
    @Param('action') action: string,
    @Query() query: Record<string, string>,
  ) {
    if (action === 'navigate') return this.browse.navigate(type, query);
    if (action === 'next-number') return this.browse.nextNumber(type, query);
    if (action === 'query') return this.browse.query(type, query);
    throw new LegacyNotFoundError('找不到 API');
  }

  @ApiOperation({ summary: 'F1 輔助輸入' })
  @LegacyRead()
  @Get('assist/:kind')
  async assist(
    @Param('kind') kind: string,
    @Query() query: Record<string, string>,
  ) {
    return this.browse.assist(kind, query);
  }
}
