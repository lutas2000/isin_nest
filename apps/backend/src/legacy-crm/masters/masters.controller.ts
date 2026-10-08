import {
  Body,
  Controller,
  Delete,
  Get,
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
import { LegacyMastersService } from './masters.service';

type Body = Record<string, unknown>;
const found = <T>(item: T | null) => {
  if (!item) throw new LegacyNotFoundError();
  return { item };
};

// 請求內容沿用 isin_vb6 的欄位；驗證與錯誤訊息在 legacy-records.ts（與舊版相同），body 不另定 DTO。

@ApiTags('舊版銷管：材質')
@LegacyController()
@Controller('legacy-crm/materials')
export class LegacyMaterialsController {
  constructor(private readonly masters: LegacyMastersService) {}

  @LegacyRead()
  @Get()
  async list(@Query('search') search = '') {
    return { items: await this.masters.listMaterials(search), limit: 500 };
  }

  @LegacyWrite()
  @Post()
  async create(
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.createMaterial(body, context) };
  }

  @LegacyRead()
  @Get(':id')
  async get(@Param('id') id: string) {
    return found(await this.masters.getMaterial(id));
  }

  @LegacyWrite()
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.updateMaterial(id, body, context) };
  }

  @LegacyWrite()
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    await this.masters.deleteMaterial(id, context);
    return { deleted: true };
  }
}

@ApiTags('舊版銷管：工件')
@LegacyController()
@Controller('legacy-crm/parts')
export class LegacyPartsController {
  constructor(private readonly masters: LegacyMastersService) {}

  @LegacyRead()
  @Get()
  async list(@Query('search') search = '') {
    return { items: await this.masters.listParts(search), limit: 500 };
  }

  @LegacyWrite()
  @Post()
  async create(
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.createPart(body, context) };
  }

  @ApiOperation({ summary: '出貨記錄：圖號的出貨明細，可限定客戶或訂單' })
  @LegacyRead()
  @Get(':drawingNo/sales')
  async sales(
    @Param('drawingNo') drawingNo: string,
    @Query('customer') customerCode = '',
    @Query('order') orderNo = '',
  ) {
    return {
      items: await this.masters.listPartSales(drawingNo, {
        customerCode,
        orderNo,
      }),
    };
  }

  @LegacyRead()
  @Get(':drawingNo')
  async get(@Param('drawingNo') drawingNo: string) {
    return found(await this.masters.getPart(drawingNo));
  }

  @LegacyWrite()
  @Put(':drawingNo')
  async update(
    @Param('drawingNo') drawingNo: string,
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.updatePart(drawingNo, body, context) };
  }

  @LegacyWrite()
  @Delete(':drawingNo')
  async remove(
    @Param('drawingNo') drawingNo: string,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    await this.masters.deletePart(drawingNo, context);
    return { deleted: true };
  }
}

@ApiTags('舊版銷管：銀行')
@LegacyController()
@Controller('legacy-crm/banks')
export class LegacyBanksController {
  constructor(private readonly masters: LegacyMastersService) {}

  @LegacyRead()
  @Get()
  async list(@Query('search') search = '') {
    return { items: await this.masters.listBanks(search), limit: 500 };
  }

  @LegacyWrite()
  @Post()
  async create(
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.createBank(body, context) };
  }

  @LegacyRead()
  @Get(':code')
  async get(@Param('code') code: string) {
    return found(await this.masters.getBank(code));
  }

  @LegacyWrite()
  @Put(':code')
  async update(
    @Param('code') code: string,
    @Body() body: Body,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    return { item: await this.masters.updateBank(code, body, context) };
  }

  @LegacyWrite()
  @Delete(':code')
  async remove(
    @Param('code') code: string,
    @LegacyContext() context: LegacyRequestContext,
  ) {
    await this.masters.deleteBank(code, context);
    return { deleted: true };
  }
}

function simpleMasterController(kind: 'phrases' | 'postal-codes', tag: string) {
  @ApiTags(tag)
  @LegacyController()
  @Controller(`legacy-crm/${kind}`)
  class SimpleMasterController {
    constructor(readonly masters: LegacyMastersService) {}

    @LegacyRead()
    @Get()
    async list(@Query('search') search = '') {
      return { items: await this.masters.listSimple(kind, search), limit: 500 };
    }

    @LegacyWrite()
    @Post()
    async create(
      @Body() body: Body,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      return { item: await this.masters.createSimple(kind, body, context) };
    }

    @LegacyRead()
    @Get(':key')
    async get(@Param('key') key: string) {
      return found(await this.masters.getSimple(kind, key));
    }

    @LegacyWrite()
    @Put(':key')
    async update(
      @Param('key') key: string,
      @Body() body: Body,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      return {
        item: await this.masters.updateSimple(kind, key, body, context),
      };
    }

    @LegacyWrite()
    @Delete(':key')
    async remove(
      @Param('key') key: string,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      await this.masters.deleteSimple(kind, key, context);
      return { deleted: true };
    }
  }
  return SimpleMasterController;
}

export const LegacyPhrasesController = simpleMasterController(
  'phrases',
  '舊版銷管：詞彙',
);
export const LegacyPostalCodesController = simpleMasterController(
  'postal-codes',
  '舊版銷管：郵遞區號',
);
