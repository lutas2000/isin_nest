import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QuoteItemService } from './quote-item.service';
import { QuoteItem } from './entities/quote-item.entity';

@ApiTags('報價單工件管理')
@Controller('crm/quote-items')
export class QuoteItemController {
  constructor(private readonly quoteItemService: QuoteItemService) {}

  @ApiOperation({ summary: '獲取所有報價單工件' })
  @ApiQuery({ name: 'quoteId', required: false, description: '報價單ID' })
  @ApiResponse({ status: 200, description: '成功返回報價單工件列表', type: [QuoteItem] })
  @Get()
  findAll(@Query('quoteId') quoteId?: string): Promise<QuoteItem[]> {
    if (quoteId) {
      return this.quoteItemService.findByQuoteId(+quoteId);
    }
    return this.quoteItemService.findAll();
  }

  @ApiOperation({ summary: '根據ID獲取單個報價單工件' })
  @ApiParam({ name: 'id', description: '報價單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回報價單工件信息', type: QuoteItem })
  @ApiResponse({ status: 404, description: '報價單工件不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<QuoteItem | null> {
    return this.quoteItemService.findOne(+id);
  }

  @ApiOperation({ summary: '建立新報價單工件' })
  @ApiResponse({ status: 201, description: '成功建立報價單工件', type: QuoteItem })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createQuoteItemDto: Partial<QuoteItem>): Promise<QuoteItem> {
    return this.quoteItemService.create(createQuoteItemDto);
  }

  @ApiOperation({ summary: '刪除報價單工件' })
  @ApiParam({ name: 'id', description: '報價單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除報價單工件' })
  @ApiResponse({ status: 404, description: '報價單工件不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.quoteItemService.remove(+id);
  }

  @ApiOperation({ summary: '更新報價單工件資料' })
  @ApiParam({ name: 'id', description: '報價單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新報價單工件資料', type: QuoteItem })
  @ApiResponse({ status: 404, description: '報價單工件不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<QuoteItem>,
  ): Promise<QuoteItem | null> {
    return this.quoteItemService.update(+id, data);
  }
}

