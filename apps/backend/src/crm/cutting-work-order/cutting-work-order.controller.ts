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
import { CuttingWorkOrderService } from './cutting-work-order.service';
import { CuttingWorkOrder } from './entities/cutting-work-order.entity';
import { CuttingWorkOrderStatus } from '../enums/work-order-status.enum';

@ApiTags('切割工作單管理')
@Controller('crm/cutting-work-orders')
export class CuttingWorkOrderController {
  constructor(private readonly cuttingWorkOrderService: CuttingWorkOrderService) {}

  @ApiOperation({ summary: '獲取所有切割工作單' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回切割工作單列表', type: [CuttingWorkOrder] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.cuttingWorkOrderService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取切割工作單' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回切割工作單列表', type: [CuttingWorkOrder] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.cuttingWorkOrderService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據狀態獲取切割工作單' })
  @ApiQuery({ name: 'status', description: '狀態', enum: CuttingWorkOrderStatus })
  @ApiResponse({ status: 200, description: '成功返回切割工作單列表', type: [CuttingWorkOrder] })
  @Get('by-status')
  findByStatus(@Query('status') status: CuttingWorkOrderStatus) {
    return this.cuttingWorkOrderService.findByStatus(status);
  }

  @ApiOperation({ summary: '根據ID獲取單個切割工作單' })
  @ApiParam({ name: 'id', description: '切割工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回切割工作單', type: CuttingWorkOrder })
  @ApiResponse({ status: 404, description: '切割工作單不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cuttingWorkOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新切割工作單' })
  @ApiResponse({ status: 201, description: '成功建立切割工作單', type: CuttingWorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<CuttingWorkOrder>) {
    return this.cuttingWorkOrderService.create(data);
  }

  @ApiOperation({ summary: '更新切割工作單' })
  @ApiParam({ name: 'id', description: '切割工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新切割工作單', type: CuttingWorkOrder })
  @ApiResponse({ status: 404, description: '切割工作單不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<CuttingWorkOrder>,
  ) {
    return this.cuttingWorkOrderService.update(id, data);
  }

  @ApiOperation({ summary: '更新切割工作單狀態' })
  @ApiParam({ name: 'id', description: '切割工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新切割工作單狀態', type: CuttingWorkOrder })
  @ApiResponse({ status: 404, description: '切割工作單不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: CuttingWorkOrderStatus,
  ) {
    return this.cuttingWorkOrderService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '分派切割人員與機台' })
  @ApiParam({ name: 'id', description: '切割工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功分派切割人員', type: CuttingWorkOrder })
  @ApiResponse({ status: 404, description: '切割工作單不存在' })
  @Patch(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { staffId: string; machineId?: string },
  ) {
    return this.cuttingWorkOrderService.assign(id, body.staffId, body.machineId);
  }

  @ApiOperation({ summary: '刪除切割工作單' })
  @ApiParam({ name: 'id', description: '切割工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除切割工作單' })
  @ApiResponse({ status: 404, description: '切割工作單不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cuttingWorkOrderService.remove(id);
  }
}
