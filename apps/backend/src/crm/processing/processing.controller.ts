import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Put,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { Processing, ProcessingStatus } from './entities/processing.entity';
import { CreateProcessingDto } from './dto/create-processing.dto';
import { UpdateProcessingDto } from './dto/update-processing.dto';

@ApiTags('加工管理')
@Controller('crm/processings')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @ApiOperation({ summary: '獲取所有加工紀錄' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回加工紀錄列表', type: [Processing] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.processingService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單工件 ID 獲取加工紀錄' })
  @ApiParam({ name: 'orderItemId', description: '訂貨單工件 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回加工紀錄列表', type: [Processing] })
  @Get('by-order-item/:orderItemId')
  findByOrderItemId(
    @Param('orderItemId', ParseIntPipe) orderItemId: number,
  ) {
    return this.processingService.findByOrderItemId(orderItemId);
  }

  @ApiOperation({ summary: '根據 ID 獲取單個加工紀錄' })
  @ApiParam({ name: 'id', description: '加工 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回加工紀錄', type: Processing })
  @ApiResponse({ status: 404, description: '加工紀錄不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.findOne(id);
  }

  @ApiOperation({ summary: '建立新加工紀錄' })
  @ApiResponse({ status: 201, description: '成功建立加工紀錄', type: Processing })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createProcessingDto: CreateProcessingDto) {
    return this.processingService.create(createProcessingDto);
  }

  @ApiOperation({ summary: '批次建立加工紀錄' })
  @ApiResponse({ status: 201, description: '成功建立加工紀錄', type: [Processing] })
  @Post('bulk')
  bulkCreate(
    @Body() body: { orderItemId: number; processingCodes: string[] },
  ) {
    return this.processingService.bulkCreate(
      body.orderItemId,
      body.processingCodes,
    );
  }

  @ApiOperation({ summary: '更新加工紀錄' })
  @ApiParam({ name: 'id', description: '加工 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新加工紀錄', type: Processing })
  @ApiResponse({ status: 404, description: '加工紀錄不存在' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProcessingDto: UpdateProcessingDto,
  ) {
    return this.processingService.update(id, updateProcessingDto);
  }

  @ApiOperation({ summary: '更新加工狀態' })
  @ApiParam({ name: 'id', description: '加工 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新加工狀態', type: Processing })
  @ApiResponse({ status: 404, description: '加工紀錄不存在' })
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ProcessingStatus,
  ) {
    return this.processingService.updateStatus(id, status);
  }

  @ApiOperation({ summary: '刪除加工紀錄' })
  @ApiParam({ name: 'id', description: '加工 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除加工紀錄' })
  @ApiResponse({ status: 404, description: '加工紀錄不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.remove(id);
  }
}
