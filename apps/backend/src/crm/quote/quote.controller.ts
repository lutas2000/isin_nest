import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { Quote } from './entities/quote.entity';
import { WorkOrder } from '../work-order/entities/work-order.entity';

@ApiTags('報價單管理')
@Controller('crm/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @ApiOperation({ summary: '獲取所有報價單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回報價單列表', type: [Quote] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.quoteService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個報價單' })
  @ApiParam({ name: 'id', description: '報價單ID', example: 'CUST001-Q001' })
  @ApiResponse({ status: 200, description: '成功返回報價單信息', type: Quote })
  @ApiResponse({ status: 404, description: '報價單不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Quote | null> {
    return this.quoteService.findOne(id);
  }

  @ApiOperation({ summary: '建立新報價單' })
  @ApiResponse({ status: 201, description: '成功建立報價單', type: Quote })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createQuoteDto: Partial<Quote>): Promise<Quote> {
    return this.quoteService.create(createQuoteDto);
  }

  @ApiOperation({ summary: '刪除報價單' })
  @ApiParam({ name: 'id', description: '報價單ID', example: 'CUST001-Q001' })
  @ApiResponse({ status: 200, description: '成功刪除報價單' })
  @ApiResponse({ status: 404, description: '報價單不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.quoteService.remove(id);
  }

  @ApiOperation({ summary: '更新報價單資料' })
  @ApiParam({ name: 'id', description: '報價單ID', example: 'CUST001-Q001' })
  @ApiResponse({ status: 200, description: '成功更新報價單資料', type: Quote })
  @ApiResponse({ status: 404, description: '報價單不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Quote>,
  ): Promise<Quote | null> {
    return this.quoteService.update(id, data);
  }

  @ApiOperation({ summary: '將報價單轉換為工單' })
  @ApiParam({ name: 'id', description: '報價單ID', example: 'CUST001-Q001' })
  @ApiResponse({ status: 200, description: '成功轉換為工單', type: WorkOrder })
  @ApiResponse({ status: 400, description: '報價單未簽名或不存在' })
  @Post(':id/convert-to-work-order')
  convertToWorkOrder(
    @Param('id') id: string,
    @Body() body: { shippingMethod: string; paymentMethod: string },
  ): Promise<WorkOrder | null> {
    return this.quoteService.convertToWorkOrder(id, body.shippingMethod, body.paymentMethod);
  }
}

