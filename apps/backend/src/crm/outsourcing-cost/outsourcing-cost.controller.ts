import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OutsourcingCostService } from './outsourcing-cost.service';
import { OutsourcingCost } from './entities/outsourcing-cost.entity';

@ApiTags('委外成本管理')
@Controller('crm/outsourcing-costs')
export class OutsourcingCostController {
  constructor(private readonly outsourcingCostService: OutsourcingCostService) {}

  @ApiOperation({ summary: '獲取所有委外成本' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回委外成本列表', type: [OutsourcingCost] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.outsourcingCostService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據加工工作單ID獲取成本' })
  @ApiParam({ name: 'workOrderId', description: '加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回委外成本列表', type: [OutsourcingCost] })
  @Get('by-work-order/:workOrderId')
  findByWorkOrderId(@Param('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.outsourcingCostService.findByProcessingWorkOrderId(workOrderId);
  }

  @ApiOperation({ summary: '獲取委外工作單的總成本' })
  @ApiParam({ name: 'workOrderId', description: '委外加工工作單ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回總成本' })
  @Get('by-work-order/:workOrderId/total')
  getTotalCost(@Param('workOrderId', ParseIntPipe) workOrderId: number) {
    return this.outsourcingCostService.getTotalCostByWorkOrder(workOrderId);
  }

  @ApiOperation({ summary: '根據ID獲取單個委外成本' })
  @ApiParam({ name: 'id', description: '委外成本ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回委外成本', type: OutsourcingCost })
  @ApiResponse({ status: 404, description: '委外成本不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingCostService.findOne(id);
  }

  @ApiOperation({ summary: '建立新委外成本' })
  @ApiResponse({ status: 201, description: '成功建立委外成本', type: OutsourcingCost })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<OutsourcingCost>) {
    return this.outsourcingCostService.create(data);
  }

  @ApiOperation({ summary: '更新委外成本' })
  @ApiParam({ name: 'id', description: '委外成本ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新委外成本', type: OutsourcingCost })
  @ApiResponse({ status: 404, description: '委外成本不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<OutsourcingCost>,
  ) {
    return this.outsourcingCostService.update(id, data);
  }

  @ApiOperation({ summary: '刪除委外成本' })
  @ApiParam({ name: 'id', description: '委外成本ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除委外成本' })
  @ApiResponse({ status: 404, description: '委外成本不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.outsourcingCostService.remove(id);
  }
}
