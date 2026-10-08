import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  LegacyContext,
  LegacyController,
  LegacyRead,
  LegacyRequestContext,
} from '../common/legacy-access';
import { LegacyPrintLogService } from './print-log.service';

@ApiTags('舊版銷管：列印紀錄')
@LegacyController()
@Controller('legacy-crm/print-log')
export class LegacyPrintLogController {
  constructor(private readonly printLog: LegacyPrintLogService) {}

  @ApiOperation({
    summary:
      '記錄列印：document_preview、document_print、report_print、statement_print',
    description:
      'body：{ kind, target, entity_key?, criteria?, row_count?, page_count? }；列印屬於讀取權限。',
  })
  @LegacyRead()
  @HttpCode(204)
  @Post()
  async record(
    @Body() body: Record<string, unknown>,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    await this.printLog.recordFromClient(context, body);
  }
}
