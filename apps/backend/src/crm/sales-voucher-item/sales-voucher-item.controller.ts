import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SalesVoucherItemService } from './sales-voucher-item.service';
import { SalesVoucherItem } from './entities/sales-voucher-item.entity';

@ApiTags('銷貨單明細')
@Controller('crm/sales-voucher-items')
export class SalesVoucherItemController {
  constructor(
    private readonly salesVoucherItemService: SalesVoucherItemService,
  ) {}

  @ApiOperation({ summary: '取得銷貨單明細列表' })
  @ApiQuery({ name: 'salesVoucherId', required: false, description: '銷貨單ID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [SalesVoucherItem] })
  @Get()
  findAll(
    @Query('salesVoucherId') salesVoucherId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (salesVoucherId) {
      return this.salesVoucherItemService.findBySalesVoucherId(
        salesVoucherId,
        page,
        limit,
      );
    }
    return this.salesVoucherItemService.findAll(page, limit);
  }

  @ApiOperation({ summary: '取得單筆明細' })
  @ApiParam({ name: 'id' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SalesVoucherItem | null> {
    return this.salesVoucherItemService.findOne(+id);
  }

  @ApiOperation({ summary: '新增明細' })
  @ApiResponse({ status: 201, type: SalesVoucherItem })
  @Post()
  create(
    @Body() body: Partial<SalesVoucherItem>,
  ): Promise<SalesVoucherItem> {
    return this.salesVoucherItemService.create(body);
  }

  @ApiOperation({ summary: '更新明細' })
  @ApiParam({ name: 'id' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<SalesVoucherItem>,
  ): Promise<SalesVoucherItem | null> {
    return this.salesVoucherItemService.update(+id, data);
  }

  @ApiOperation({ summary: '刪除明細' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.salesVoucherItemService.remove(+id);
  }
}
