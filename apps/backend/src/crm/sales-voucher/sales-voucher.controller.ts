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
import { SalesVoucherService } from './sales-voucher.service';
import { SalesVoucher } from './entities/sales-voucher.entity';
import { CreateSalesVoucherDto } from './dto/create-sales-voucher.dto';
import { SalesStatisticsQueryDto } from './dto/sales-statistics.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@ApiTags('銷貨單管理')
@Controller('crm/sales-vouchers')
export class SalesVoucherController {
  constructor(private readonly salesVoucherService: SalesVoucherService) {}

  @ApiOperation({ summary: '取得銷貨單列表（分頁）' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: '成功', type: [SalesVoucher] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.salesVoucherService.findAll(page, limit);
  }

  @ApiOperation({ summary: '取得銷售統計（銷貨單/銷貨明細）' })
  @ApiResponse({
    status: 200,
    description: '成功取得銷售統計資料',
    type: PaginatedResponseDto,
  })
  @Get('statistics')
  findStatistics(@Query() query: SalesStatisticsQueryDto) {
    return this.salesVoucherService.findStatistics(query);
  }

  @ApiOperation({ summary: '取得單一銷貨單' })
  @ApiParam({ name: 'id', description: '銷貨單ID' })
  @ApiResponse({ status: 200, type: SalesVoucher })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<SalesVoucher | null> {
    return this.salesVoucherService.findOne(id);
  }

  @ApiOperation({
    summary: '建立銷貨單',
    description:
      '可手動填寫表頭與可選明細；若帶 sourceOrderId 則從訂單複製表頭與明細',
  })
  @ApiResponse({ status: 201, type: SalesVoucher })
  @Post()
  create(@Body() dto: CreateSalesVoucherDto): Promise<SalesVoucher> {
    return this.salesVoucherService.create(dto);
  }

  @ApiOperation({ summary: '更新銷貨單表頭（不含明細；amount 由明細加總）' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, type: SalesVoucher })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<SalesVoucher>,
  ): Promise<SalesVoucher | null> {
    return this.salesVoucherService.update(id, data);
  }

  @ApiOperation({ summary: '刪除銷貨單' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.salesVoucherService.remove(id);
  }
}
