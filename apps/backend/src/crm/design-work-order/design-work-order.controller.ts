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
  ApiBody,
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

  @ApiOperation({ summary: '根據訂單ID獲取設計工作單' })
  @ApiParam({ name: 'orderId', description: '訂單ID', example: 'ORD001' })
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

  @ApiOperation({ summary: '取得 CNC 檔案預覽內容（優先 .nc，找不到 fallback .cnc）' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功返回 CNC 檔案內容與寬高',
    schema: {
      example: {
        drawingNumber: 'E2C7B001',
        fileName: 'E2C7B001.nc',
        extension: 'nc',
        width: 1200.5,
        height: 800.25,
        content: 'G0 X0 Y0\nG1 X10 Y10',
      },
    },
  })
  @ApiResponse({ status: 404, description: '設計工作單或 CNC 檔案不存在' })
  @Get(':id/cnc-preview')
  getCncPreview(@Param('id', ParseIntPipe) id: number) {
    return this.designWorkOrderService.getCncPreview(id);
  }

  @ApiOperation({ summary: '根據ID獲取單個設計工作單（含圖組子單）' })
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

  @ApiOperation({ summary: '將頂層工作單轉為圖組' })
  @ApiParam({ name: 'id', description: '設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功', type: DesignWorkOrder })
  @Post(':id/convert-to-group')
  convertToGroup(@Param('id', ParseIntPipe) id: number) {
    return this.designWorkOrderService.convertToGroup(id);
  }

  @ApiOperation({ summary: '解除圖組（刪除所有子工作單）' })
  @ApiParam({ name: 'id', description: '圖組（父）設計工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功', type: DesignWorkOrder })
  @Post(':id/dissolve-group')
  dissolveGroup(@Param('id', ParseIntPipe) id: number) {
    return this.designWorkOrderService.dissolveGroup(id);
  }

  @ApiOperation({ summary: '將工作單加入圖組' })
  @ApiParam({ name: 'id', description: '圖組（父）設計工作單ID', example: 1 })
  @ApiBody({
    schema: { example: { memberId: 2 }, properties: { memberId: { type: 'number' } } },
  })
  @ApiResponse({ status: 200, description: '成功', type: DesignWorkOrder })
  @Post(':id/members')
  addMember(
    @Param('id', ParseIntPipe) groupId: number,
    @Body('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.designWorkOrderService.addMember(groupId, memberId);
  }

  @ApiOperation({ summary: '將工作單自圖組移除（不刪除工作單）' })
  @ApiParam({ name: 'id', description: '圖組（父）設計工作單ID', example: 1 })
  @ApiParam({ name: 'memberId', description: '子工作單ID', example: 2 })
  @ApiResponse({ status: 200, description: '成功', type: DesignWorkOrder })
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id', ParseIntPipe) groupId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.designWorkOrderService.removeMember(groupId, memberId);
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
