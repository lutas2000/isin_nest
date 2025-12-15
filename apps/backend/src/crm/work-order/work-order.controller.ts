import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkOrderService } from './work-order.service';
import { WorkOrder } from './entities/work-order.entity';

@ApiTags('工單管理')
@Controller('crm/work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @ApiOperation({ summary: '獲取所有工單' })
  @ApiResponse({ status: 200, description: '成功返回工單列表', type: [WorkOrder] })
  @Get()
  findAll(): Promise<WorkOrder[]> {
    return this.workOrderService.findAll();
  }

  @ApiOperation({ summary: '根據ID獲取單個工單' })
  @ApiParam({ name: 'id', description: '工單ID', example: 'WO001' })
  @ApiResponse({ status: 200, description: '成功返回工單信息', type: WorkOrder })
  @ApiResponse({ status: 404, description: '工單不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<WorkOrder | null> {
    return this.workOrderService.findOne(id);
  }

  @ApiOperation({ summary: '建立新工單' })
  @ApiResponse({ status: 201, description: '成功建立工單', type: WorkOrder })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createWorkOrderDto: Partial<WorkOrder>): Promise<WorkOrder> {
    return this.workOrderService.create(createWorkOrderDto);
  }

  @ApiOperation({ summary: '刪除工單' })
  @ApiParam({ name: 'id', description: '工單ID', example: 'WO001' })
  @ApiResponse({ status: 200, description: '成功刪除工單' })
  @ApiResponse({ status: 404, description: '工單不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.workOrderService.remove(id);
  }

  @ApiOperation({ summary: '更新工單資料' })
  @ApiParam({ name: 'id', description: '工單ID', example: 'WO001' })
  @ApiResponse({ status: 200, description: '成功更新工單資料', type: WorkOrder })
  @ApiResponse({ status: 404, description: '工單不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<WorkOrder>,
  ): Promise<WorkOrder | null> {
    return this.workOrderService.update(id, data);
  }

  @ApiOperation({ summary: '完成工單' })
  @ApiParam({ name: 'id', description: '工單ID', example: 'WO001' })
  @ApiResponse({ status: 200, description: '成功完成工單', type: WorkOrder })
  @ApiResponse({ status: 404, description: '工單不存在' })
  @Post(':id/complete')
  complete(@Param('id') id: string): Promise<WorkOrder | null> {
    return this.workOrderService.complete(id);
  }
}

