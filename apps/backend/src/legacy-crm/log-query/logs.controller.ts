import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PrintLogQueryDto, WriteLogQueryDto } from './logs.dto';
import { LegacyLogsService } from './logs.service';

/**
 * 舊版銷管的寫入紀錄與列印紀錄查詢（LEGACY-CRM-REBUILD-PLAN.md 2.4、2.5、8）：只有 admin。
 * 記錄列印的 `POST /legacy-crm/print-log` 在 print-log/，crm read 即可。
 */
@ApiTags('舊版銷管：紀錄查詢（admin）')
@ApiBearerAuth('JWT-auth')
@Controller('legacy-crm/logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LegacyLogsController {
  constructor(private readonly logs: LegacyLogsService) {}

  @Get('facets')
  @ApiOperation({
    summary: '篩選選項：write_log 的資料種類、print_log 的列印項目',
  })
  @ApiResponse({ status: 200, description: '{ entity_types, print_targets }' })
  @ApiResponse({ status: 403, description: '不是 admin' })
  facets() {
    return this.logs.facets();
  }

  @Get('write')
  @ApiOperation({
    summary: '寫入紀錄列表（不含前後資料）',
    description: '回 { items, total, page, page_size }，新的在前。',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: '條件不合法' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '不是 admin' })
  writeLog(@Query() query: WriteLogQueryDto) {
    return this.logs.writeLog(query);
  }

  @Get('write/:id')
  @ApiOperation({ summary: '一筆寫入紀錄，含 before、after、side_effects' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: '{ item }' })
  @ApiResponse({ status: 403, description: '不是 admin' })
  @ApiResponse({ status: 404, description: '找不到' })
  writeLogEntry(@Param('id') id: string) {
    if (!/^\d{1,18}$/.test(id)) throw new BadRequestException('編號無效');
    return this.logs.writeLogEntry(id);
  }

  @Get('print')
  @ApiOperation({
    summary: '列印與報表查詢紀錄列表',
    description: '回 { items, total, page, page_size }，新的在前。',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: '條件不合法' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '不是 admin' })
  printLog(@Query() query: PrintLogQueryDto) {
    return this.logs.printLog(query);
  }
}
