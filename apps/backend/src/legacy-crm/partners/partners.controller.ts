import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  LegacyContext,
  LegacyController,
  LegacyRead,
  LegacyRequestContext,
  LegacyWrite,
} from '../common/legacy-access';
import { LegacyNotFoundError } from '../common/legacy-errors';
import { LegacyPartnersService } from './partners.service';

/**
 * 客戶、廠商建檔。請求內容沿用 isin_vb6 的欄位；驗證與錯誤訊息在 legacy-records.ts（與舊版相同），
 * 因此 body 不另定 class-validator DTO。
 */
@ApiTags('舊版銷管：客戶／廠商')
@LegacyController()
@Controller('legacy-crm/partners')
export class LegacyPartnersController {
  constructor(private readonly partners: LegacyPartnersService) {}

  @ApiOperation({ summary: '客戶或廠商列表（最多 500 筆）' })
  @LegacyRead()
  @Get()
  async list(@Query('kind') kind: string, @Query('search') search = '') {
    return { items: await this.partners.list(kind, search), limit: 500 };
  }

  @LegacyWrite()
  @Post()
  async create(
    @Body() body: Record<string, unknown>,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.partners.create(body, context) };
  }

  @ApiOperation({ summary: '客戶更改編號：單據與工件上的客戶編號一起換' })
  @LegacyWrite()
  @HttpCode(200)
  @Post('customer/:code/rename')
  async rename(
    @Param('code') code: string,
    @Body() body: { code?: unknown },
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return {
      item: await this.partners.renameCustomer(code, body?.code, context),
    };
  }

  @LegacyRead()
  @Get(':kind/:code')
  async get(@Param('kind') kind: string, @Param('code') code: string) {
    const item = await this.partners.get(kind, code);
    if (!item) throw new LegacyNotFoundError();
    return { item };
  }

  @LegacyWrite()
  @Put(':kind/:code')
  async update(
    @Param('kind') kind: string,
    @Param('code') code: string,
    @Body() body: Record<string, unknown>,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.partners.update(kind, code, body, context) };
  }

  @LegacyWrite()
  @Delete(':kind/:code')
  async remove(
    @Param('kind') kind: string,
    @Param('code') code: string,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    await this.partners.remove(kind, code, context);
    return { deleted: true };
  }
}
