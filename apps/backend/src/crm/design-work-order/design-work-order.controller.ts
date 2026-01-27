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
import { DesignWorkOrderService } from './design-work-order.service';
import { DesignWorkOrder } from './entities/design-work-order.entity';
import { DesignWorkOrderStatus } from '../enums/work-order-status.enum';

@ApiTags('設計工作單管理')
@Controller('crm/design-work-orders')
export class DesignWorkOrderController {
  constructor(private readonly designWorkOrderService: DesignWorkOrderService) {}

  @ApiOperation({ summary: '獲取所有設計工作單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回設計工作單列表', type: [DesignWorkOrder] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.designWorkOrderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取設計工作單' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回設計工作單列表', type: [DesignWorkOrder] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.designWorkOrderService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據狀態獲取設計工作單' })
  @ApiQuery({ name: 'status', description: '狀態', enum: DesignWorkOrderStatus })
  @ApiResponse({ status: 200, description: '成功返回設計工作單列表', type: [DesignWorkOrder] })
  @Get('by-status')
  findByStatus(@Query('status') status: DesignWorkOrderStatus) {
    return this.designWorkOrderService.findByStatus(status);
  }

  @ApiOperation({ summary: '根據ID獲取單個設計工作單' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回設計工作單', type: DesignWorkOrder })
  @ApiResponse({ status: 404, description: '設計工作單不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.designWorkOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新設計工作單' })
  @ApiResponse({ status: 201, description: '成功建立設計工作單', type: DesignWorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<DesignWorkOrder>) {
    return this.designWorkOrderService.create(data);
  }

  @ApiOperation({ summary: '更新設計工作單' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新設計工作單', type: DesignWorkOrder })
  @ApiResponse({ status: 404, description: '設計工作單不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<DesignWorkOrder>,
  ) {
    return this.designWorkOrderService.update(id, data);
  }

  @ApiOperation({ summary: '更新設計工作單狀態' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新設計工作單狀態', type: DesignWorkOrder })
  @ApiResponse({ status: 404, description: '設計工作單不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: DesignWorkOrderStatus,
  ) {
    return this.designWorkOrderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '分派設計師' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功分派設計師', type: DesignWorkOrder })
  @ApiResponse({ status: 404, description: '設計工作單不存在' })
  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body('staffId') staffId: string,
  ) {
    return this.designWorkOrderService.assign(id, staffId);
  }

  @ApiOperation({ summary: '刪除設計工作單' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除設計工作單' })
  @ApiResponse({ status: 404, description: '設計工作單不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.designWorkOrderService.remove(id);
  }
}
