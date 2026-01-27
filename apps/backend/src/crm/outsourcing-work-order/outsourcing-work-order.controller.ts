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
import { OutsourcingWorkOrderService } from './outsourcing-work-order.service';
import { OutsourcingWorkOrder } from './entities/outsourcing-work-order.entity';
import { OutsourcingWorkOrderStatus } from '../enums/work-order-status.enum';

@ApiTags('委外加工工作單管理')
@Controller('crm/outsourcing-work-orders')
export class OutsourcingWorkOrderController {
  constructor(private readonly outsourcingWorkOrderService: OutsourcingWorkOrderService) {}

  @ApiOperation({ summary: '獲取所有委外加工工作單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單列表', type: [OutsourcingWorkOrder] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.outsourcingWorkOrderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取委外加工工作單' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單列表', type: [OutsourcingWorkOrder] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.outsourcingWorkOrderService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據廠商ID獲取委外加工工作單' })
  @ApiParam({ name: 'vendorId', description: '廠商ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單列表', type: [OutsourcingWorkOrder] })
  @Get('by-vendor/:vendorId')
  findByVendorId(@Param('vendorId', ParseIntPipe) vendorId: number) {
    return this.outsourcingWorkOrderService.findByVendorId(vendorId);
  }

  @ApiOperation({ summary: '根據狀態獲取委外加工工作單' })
  @ApiQuery({ name: 'status', description: '狀態', enum: OutsourcingWorkOrderStatus })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單列表', type: [OutsourcingWorkOrder] })
  @Get('by-status')
  findByStatus(@Query('status') status: OutsourcingWorkOrderStatus) {
    return this.outsourcingWorkOrderService.findByStatus(status);
  }

  @ApiOperation({ summary: '根據ID獲取單個委外加工工作單' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回委外加工工作單', type: OutsourcingWorkOrder })
  @ApiResponse({ status: 404, description: '委外加工工作單不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingWorkOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新委外加工工作單' })
  @ApiResponse({ status: 201, description: '成功建立委外加工工作單', type: OutsourcingWorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<OutsourcingWorkOrder>) {
    return this.outsourcingWorkOrderService.create(data);
  }

  @ApiOperation({ summary: '更新委外加工工作單' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新委外加工工作單', type: OutsourcingWorkOrder })
  @ApiResponse({ status: 404, description: '委外加工工作單不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<OutsourcingWorkOrder>,
  ) {
    return this.outsourcingWorkOrderService.update(id, data);
  }

  @ApiOperation({ summary: '更新委外加工工作單狀態' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新委外加工工作單狀態', type: OutsourcingWorkOrder })
  @ApiResponse({ status: 404, description: '委外加工工作單不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OutsourcingWorkOrderStatus,
  ) {
    return this.outsourcingWorkOrderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '標記為已送出' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功標記為已送出', type: OutsourcingWorkOrder })
  @Patch(':id/ship')
  ship(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingWorkOrderService.ship(id);
  }

  @ApiOperation({ summary: '標記為已取回' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功標記為已取回', type: OutsourcingWorkOrder })
  @Patch(':id/return')
  markReturned(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingWorkOrderService.markReturned(id);
  }

  @ApiOperation({ summary: '刪除委外加工工作單' })
  @ApiParam({ name: 'id', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除委外加工工作單' })
  @ApiResponse({ status: 404, description: '委外加工工作單不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingWorkOrderService.remove(id);
  }
}
