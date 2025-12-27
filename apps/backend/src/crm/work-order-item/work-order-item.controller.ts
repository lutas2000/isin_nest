import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { WorkOrderItemService } from './work-order-item.service';
import { WorkOrderItem } from './entities/work-order-item.entity';

@ApiTags('工單工件管理')
@Controller('crm/work-order-items')
export class WorkOrderItemController {
  constructor(private readonly workOrderItemService: WorkOrderItemService) {}

  @ApiOperation({ summary: '獲取所有工單工件' })
  @ApiQuery({ name: 'workOrderId', required: false, description: '工單ID' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回工單工件列表', type: [WorkOrderItem] })
  @Get()
  findAll(
    @Query('workOrderId') workOrderId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (workOrderId) {
      return this.workOrderItemService.findByWorkOrderId(workOrderId, page, limit);
    }
    return this.workOrderItemService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個工單工件' })
  @ApiParam({ name: 'id', description: '工單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回工單工件信息', type: WorkOrderItem })
  @ApiResponse({ status: 404, description: '工單工件不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<WorkOrderItem | null> {
    return this.workOrderItemService.findOne(+id);
  }

  @ApiOperation({ summary: '建立新工單工件' })
  @ApiResponse({ status: 201, description: '成功建立工單工件', type: WorkOrderItem })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createWorkOrderItemDto: Partial<WorkOrderItem>): Promise<WorkOrderItem> {
    return this.workOrderItemService.create(createWorkOrderItemDto);
  }

  @ApiOperation({ summary: '刪除工單工件' })
  @ApiParam({ name: 'id', description: '工單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除工單工件' })
  @ApiResponse({ status: 404, description: '工單工件不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.workOrderItemService.remove(+id);
  }

  @ApiOperation({ summary: '更新工單工件資料' })
  @ApiParam({ name: 'id', description: '工單工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新工單工件資料', type: WorkOrderItem })
  @ApiResponse({ status: 404, description: '工單工件不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<WorkOrderItem>,
  ): Promise<WorkOrderItem | null> {
    return this.workOrderItemService.update(+id, data);
  }
}

