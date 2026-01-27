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
import { DeliveryWorkOrderService } from './delivery-work-order.service';
import { DeliveryWorkOrder } from './entities/delivery-work-order.entity';
import { DeliveryWorkOrderStatus } from '../enums/work-order-status.enum';

@ApiTags('送貨工作單管理')
@Controller('crm/delivery-work-orders')
export class DeliveryWorkOrderController {
  constructor(private readonly deliveryWorkOrderService: DeliveryWorkOrderService) {}

  @ApiOperation({ summary: '獲取所有送貨工作單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回送貨工作單列表', type: [DeliveryWorkOrder] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.deliveryWorkOrderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取送貨工作單' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回送貨工作單列表', type: [DeliveryWorkOrder] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.deliveryWorkOrderService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據司機ID獲取送貨工作單' })
  @ApiParam({ name: 'driverId', description: '司機員工編號', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功返回送貨工作單列表', type: [DeliveryWorkOrder] })
  @Get('by-driver/:driverId')
  findByDriverId(@Param('driverId') driverId: string) {
    return this.deliveryWorkOrderService.findByDriverId(driverId);
  }

  @ApiOperation({ summary: '根據狀態獲取送貨工作單' })
  @ApiQuery({ name: 'status', description: '狀態', enum: DeliveryWorkOrderStatus })
  @ApiResponse({ status: 200, description: '成功返回送貨工作單列表', type: [DeliveryWorkOrder] })
  @Get('by-status')
  findByStatus(@Query('status') status: DeliveryWorkOrderStatus) {
    return this.deliveryWorkOrderService.findByStatus(status);
  }

  @ApiOperation({ summary: '根據ID獲取單個送貨工作單' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回送貨工作單', type: DeliveryWorkOrder })
  @ApiResponse({ status: 404, description: '送貨工作單不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryWorkOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新送貨工作單' })
  @ApiResponse({ status: 201, description: '成功建立送貨工作單', type: DeliveryWorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<DeliveryWorkOrder>) {
    return this.deliveryWorkOrderService.create(data);
  }

  @ApiOperation({ summary: '更新送貨工作單' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新送貨工作單', type: DeliveryWorkOrder })
  @ApiResponse({ status: 404, description: '送貨工作單不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<DeliveryWorkOrder>,
  ) {
    return this.deliveryWorkOrderService.update(id, data);
  }

  @ApiOperation({ summary: '更新送貨工作單狀態' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新送貨工作單狀態', type: DeliveryWorkOrder })
  @ApiResponse({ status: 404, description: '送貨工作單不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: DeliveryWorkOrderStatus,
  ) {
    return this.deliveryWorkOrderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '分派司機' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功分派司機', type: DeliveryWorkOrder })
  @ApiResponse({ status: 404, description: '送貨工作單不存在' })
  @Patch(':id/assign-driver')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body('driverId') driverId: string,
  ) {
    return this.deliveryWorkOrderService.assignDriver(id, driverId);
  }

  @ApiOperation({ summary: '標記為準備送貨' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功標記為準備送貨', type: DeliveryWorkOrder })
  @Patch(':id/ready')
  markReady(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryWorkOrderService.markReady(id);
  }

  @ApiOperation({ summary: '開始送貨' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功開始送貨', type: DeliveryWorkOrder })
  @Patch(':id/start')
  startDelivery(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryWorkOrderService.startDelivery(id);
  }

  @ApiOperation({ summary: '標記為已送達' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功標記為已送達', type: DeliveryWorkOrder })
  @Patch(':id/delivered')
  markDelivered(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryWorkOrderService.markDelivered(id);
  }

  @ApiOperation({ summary: '刪除送貨工作單' })
  @ApiParam({ name: 'id', description: '送貨工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除送貨工作單' })
  @ApiResponse({ status: 404, description: '送貨工作單不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryWorkOrderService.remove(id);
  }
}
