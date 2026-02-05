import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProcessingWorkOrderService } from './processing-work-order.service';
import { ProcessingWorkOrder } from './entities/processing-work-order.entity';
import { ProcessingWorkOrderStatus } from '../enums/work-order-status.enum';

@ApiTags('加工工作單管理')
@Controller('crm/processing-work-orders')
export class ProcessingWorkOrderController {
  constructor(private readonly processingWorkOrderService: ProcessingWorkOrderService) {}

  @ApiOperation({ summary: '獲取所有加工工作單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回加工工作單列表', type: [ProcessingWorkOrder] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.processingWorkOrderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '獲取所有委外加工工作單' })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單列表', type: [ProcessingWorkOrder] })
  @Get('outsourced')
  findOutsourced() {
    return this.processingWorkOrderService.findOutsourcedWorkOrders();
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取加工工作單' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回加工工作單列表', type: [ProcessingWorkOrder] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.processingWorkOrderService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據訂貨單工件ID獲取加工工作單' })
  @ApiParam({ name: 'orderItemId', description: '訂貨單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回加工工作單列表', type: [ProcessingWorkOrder] })
  @Get('by-order-item/:orderItemId')
  findByOrderItemId(@Param('orderItemId', ParseIntPipe) orderItemId: number) {
    return this.processingWorkOrderService.findByOrderItemId(orderItemId);
  }

  @ApiOperation({ summary: '根據狀態獲取加工工作單' })
  @ApiQuery({ name: 'status', description: '狀態', enum: ProcessingWorkOrderStatus })
  @ApiResponse({ status: 200, description: '成功返回加工工作單列表', type: [ProcessingWorkOrder] })
  @Get('by-status')
  findByStatus(@Query('status') status: ProcessingWorkOrderStatus) {
    return this.processingWorkOrderService.findByStatus(status);
  }

  @ApiOperation({ summary: '根據ID獲取單個加工工作單' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回加工工作單', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.processingWorkOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新加工工作單' })
  @ApiResponse({ status: 201, description: '成功建立加工工作單', type: ProcessingWorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<ProcessingWorkOrder>) {
    return this.processingWorkOrderService.create(data);
  }

  @ApiOperation({ summary: '更新加工工作單' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新加工工作單', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<ProcessingWorkOrder>,
  ) {
    return this.processingWorkOrderService.update(id, data);
  }

  @ApiOperation({ summary: '更新加工工作單狀態' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新加工工作單狀態', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ProcessingWorkOrderStatus,
  ) {
    return this.processingWorkOrderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '分派加工人員' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功分派加工人員', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body('staffId') staffId: string,
  ) {
    return this.processingWorkOrderService.assign(id, staffId);
  }

  @ApiOperation({ summary: '記錄送出日期（委外加工）' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功記錄送出日期', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Patch(':id/ship')
  ship(@Param('id', ParseIntPipe) id: number) {
    return this.processingWorkOrderService.ship(id);
  }

  @ApiOperation({ summary: '記錄取回日期（委外加工）' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功記錄取回日期', type: ProcessingWorkOrder })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Patch(':id/return')
  return(@Param('id', ParseIntPipe) id: number) {
    return this.processingWorkOrderService.return(id);
  }

  @ApiOperation({ summary: '刪除加工工作單' })
  @ApiParam({ name: 'id', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除加工工作單' })
  @ApiResponse({ status: 404, description: '加工工作單不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.processingWorkOrderService.remove(id);
  }
}
