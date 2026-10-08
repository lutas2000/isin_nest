import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegacyController, LegacyRead } from '../common/legacy-access';
import { LegacyDrawingsService } from './drawings.service';

/** 同 isin_vb6 searchParams.get：重複的參數取第一個。 */
const firstText = (value: unknown) => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : '';
};

/** 舊版圖檔：單據列印的工件外形與工作登錄的 CNC 檔狀態（同 isin_vb6 /api/drawings）。 */
@ApiTags('舊版銷管：圖檔')
@LegacyController()
@Controller('legacy-crm/drawings')
export class LegacyDrawingsController {
  constructor(private readonly drawings: LegacyDrawingsService) {}

  @ApiOperation({
    summary: '工件外形（最多 99 個圖號）；customer 有值時依該客戶的 DXF 路徑',
  })
  @LegacyRead()
  @Get('shapes')
  shapes(
    @Query('numbers') numbers: unknown,
    @Query('customer') customer: unknown,
  ) {
    return this.drawings.shapes(
      firstText(numbers).split(','),
      firstText(customer),
    );
  }

  @ApiOperation({
    summary: 'CNC 檔狀態（Y／空白）；未設定 CNC 資料夾時 items 為 null',
  })
  @LegacyRead()
  @Get('cnc')
  cnc(@Query('numbers') numbers: unknown) {
    return this.drawings.cncStatus(firstText(numbers).split(','));
  }
}
