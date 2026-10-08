import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Type,
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
import { LegacyGroupsService } from './groups.service';
import { LegacyOrdersService } from './orders.service';
import { LegacyQuotesService } from './quotes.service';
import { LegacyReceiptsService } from './receipts.service';
import { LegacySalesService } from './sales.service';
import { LegacyWorksService } from './works.service';

type Body = Record<string, unknown>;

interface DocumentService {
  list(search: string): Promise<unknown[]>;
  get(key: string): Promise<unknown>;
  create(input: unknown, context: LegacyRequestContext): Promise<unknown>;
  update(
    key: string,
    input: unknown,
    context: LegacyRequestContext,
  ): Promise<unknown>;
  remove(key: string, context: LegacyRequestContext): Promise<void>;
}

/**
 * 單據與圖組的標準路由（與 isin_vb6 相同）：列表最多 500 筆、單筆含明細、新增、修改、刪除。
 * 請求內容沿用 isin_vb6 的欄位；驗證與錯誤訊息在 legacy-records.ts，body 不另定 DTO。
 */
function documentController<S extends DocumentService>(
  path: string,
  tag: string,
  service: Type<S>,
) {
  @ApiTags(tag)
  @LegacyController()
  @Controller(`legacy-crm/${path}`)
  class DocumentController {
    constructor(readonly documents: S) {}

    @LegacyRead()
    @Get()
    async list(@Query('search') search = '') {
      return { items: await this.documents.list(search), limit: 500 };
    }

    @LegacyWrite()
    @Post()
    async create(
      @Body() body: Body,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      return { item: await this.documents.create(body, context) };
    }

    @LegacyRead()
    @Get(':key')
    async get(@Param('key') key: string) {
      const item = await this.documents.get(key);
      if (!item) throw new LegacyNotFoundError();
      return { item };
    }

    @LegacyWrite()
    @Put(':key')
    async update(
      @Param('key') key: string,
      @Body() body: Body,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      return { item: await this.documents.update(key, body, context) };
    }

    @LegacyWrite()
    @Delete(':key')
    async remove(
      @Param('key') key: string,
      @LegacyContext() context: LegacyRequestContext,
    ) {
      await this.documents.remove(key, context);
      return { deleted: true };
    }
  }
  Reflect.defineMetadata('design:paramtypes', [service], DocumentController);
  return DocumentController;
}

export const LegacyOrdersController = documentController(
  'orders',
  '舊版銷管：訂貨登錄',
  LegacyOrdersService,
);
export const LegacySalesController = documentController(
  'sales',
  '舊版銷管：出貨登錄',
  LegacySalesService,
);
export const LegacyQuotesController = documentController(
  'quotes',
  '舊版銷管：報價登錄',
  LegacyQuotesService,
);
export const LegacyWorksController = documentController(
  'work-orders',
  '舊版銷管：工作登錄',
  LegacyWorksService,
);
export const LegacyReceiptsController = documentController(
  'receipts',
  '舊版銷管：收款登錄',
  LegacyReceiptsService,
);
export const LegacyGroupsController = documentController(
  'groups',
  '舊版銷管：圖組建檔',
  LegacyGroupsService,
);

@ApiTags('舊版銷管：收款登錄')
@LegacyController()
@Controller('legacy-crm/receipt-candidates')
export class LegacyReceiptCandidatesController {
  constructor(private readonly receipts: LegacyReceiptsService) {}

  @ApiOperation({
    summary: '沖帳明細候選：客戶在帳款結日以前還有未收的出貨，與前期預收',
  })
  @LegacyRead()
  @Get()
  async candidates(
    @Query('customer_code') customerCode = '',
    @Query('closing_date') closingDate = '',
    @Query('receipt_no') receiptNo = '',
  ) {
    return this.receipts.candidates({ customerCode, closingDate, receiptNo });
  }
}
