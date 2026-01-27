import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrderItemService } from './order-item.service';
import { OrderItem } from './entities/order-item.entity';

@ApiTags('訂貨單工件管理')
@Controller('crm/order-items')
export class OrderItemController {
  constructor(private readonly orderItemService: OrderItemService) {}

  @ApiOperation({ summary: '獲取所有訂貨單工件' })
  @ApiQuery({ name: 'orderId', required: false, description: '訂貨單ID' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回訂貨單工件列表', type: [OrderItem] })
  @Get()
  findAll(
    @Query('orderId') orderId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (orderId) {
      return this.orderItemService.findByOrderId(orderId, page, limit);
    }
    return this.orderItemService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個訂貨單工件' })
  @ApiParam({ name: 'id', description: '訂貨單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回訂貨單工件信息', type: OrderItem })
  @ApiResponse({ status: 404, description: '訂貨單工件不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<OrderItem | null> {
    return this.orderItemService.findOne(+id);
  }

  @ApiOperation({ summary: '建立新訂貨單工件' })
  @ApiResponse({ status: 201, description: '成功建立訂貨單工件', type: OrderItem })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createOrderItemDto: Partial<OrderItem>): Promise<OrderItem> {
    return this.orderItemService.create(createOrderItemDto);
  }

  @ApiOperation({ summary: '刪除訂貨單工件' })
  @ApiParam({ name: 'id', description: '訂貨單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除訂貨單工件' })
  @ApiResponse({ status: 404, description: '訂貨單工件不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.orderItemService.remove(+id);
  }

  @ApiOperation({ summary: '更新訂貨單工件資料' })
  @ApiParam({ name: 'id', description: '訂貨單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新訂貨單工件資料', type: OrderItem })
  @ApiResponse({ status: 404, description: '訂貨單工件不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<OrderItem>,
  ): Promise<OrderItem | null> {
    return this.orderItemService.update(+id, data);
  }
}
