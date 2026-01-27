import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { Order, OrderStatus } from './entities/order.entity';

@ApiTags('訂貨單管理')
@Controller('crm/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: '獲取所有訂貨單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回訂貨單列表', type: [Order] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.orderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個訂貨單' })
  @ApiParam({ name: 'id', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回訂貨單信息', type: Order })
  @ApiResponse({ status: 404, description: '訂貨單不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Order | null> {
    return this.orderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新訂貨單' })
  @ApiResponse({ status: 201, description: '成功建立訂貨單', type: Order })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createOrderDto: Partial<Order>): Promise<Order> {
    return this.orderService.create(createOrderDto);
  }

  @ApiOperation({ summary: '刪除訂貨單' })
  @ApiParam({ name: 'id', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功刪除訂貨單' })
  @ApiResponse({ status: 404, description: '訂貨單不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.orderService.remove(id);
  }

  @ApiOperation({ summary: '更新訂貨單資料' })
  @ApiParam({ name: 'id', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功更新訂貨單資料', type: Order })
  @ApiResponse({ status: 404, description: '訂貨單不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Order>,
  ): Promise<Order | null> {
    return this.orderService.update(id, data);
  }

  @ApiOperation({ summary: '更新訂貨單狀態' })
  @ApiParam({ name: 'id', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功更新訂貨單狀態', type: Order })
  @ApiResponse({ status: 404, description: '訂貨單不存在' })
  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ): Promise<Order | null> {
    return this.orderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '完成訂貨單' })
  @ApiParam({ name: 'id', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功完成訂貨單', type: Order })
  @ApiResponse({ status: 404, description: '訂貨單不存在' })
  @Post(':id/complete')
  complete(@Param('id') id: string): Promise<Order | null> {
    return this.orderService.complete(id);
  }
}
