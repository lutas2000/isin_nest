import {
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BaseManhour } from './entities/base-manhour.entity';
import { BaseManhourService } from './base-manhour.service';

export abstract class BaseManhourController<T extends BaseManhour> {
  protected entityName: string;

  constructor(
    private service: BaseManhourService<T>,
    private entityClass: new () => T,
    entityName: string,
  ) {
    this.entityName = entityName;
  }

  @ApiOperation({ summary: '獲取所有工時記錄' })
  @ApiResponse({
    status: 200,
    description: '成功返回工時記錄列表',
    type: [Object], // 使用 Object 因為泛型在 Swagger 中的限制
  })
  @Get()
  findAll(): Promise<T[]> {
    return this.service.findAll();
  }

  @ApiOperation({ summary: '根據ID獲取單個工時記錄' })
  @ApiParam({ name: 'id', description: '工時記錄ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功返回工時記錄',
    type: Object,
  })
  @ApiResponse({ status: 404, description: '工時記錄不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<T | null> {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: '根據員工ID獲取工時記錄' })
  @ApiParam({ name: 'staffId', description: '員工ID', example: 'STAFF001' })
  @ApiResponse({
    status: 200,
    description: '成功返回員工工時記錄',
    type: [Object],
  })
  @Get('staff/:staffId')
  findByStaffId(@Param('staffId') staffId: string): Promise<T[]> {
    return this.service.findByStaffId(staffId);
  }

  @ApiOperation({ summary: '根據日期範圍查詢工時記錄' })
  @ApiQuery({
    name: 'startDate',
    description: '開始日期 (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: '結束日期 (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回日期範圍內的工時記錄',
    type: [Object],
  })
  @Get('date-range/search')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<T[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.service.findByDateRange(start, end, this.getQueryAlias());
  }

  @ApiOperation({ summary: '根據員工ID和日期查詢工時記錄' })
  @ApiParam({ name: 'staffId', description: '員工ID', example: 'STAFF001' })
  @ApiQuery({
    name: 'date',
    description: '日期 (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回特定日期的員工工時記錄',
    type: [Object],
  })
  @Get('staff/:staffId/date')
  findByStaffIdAndDate(
    @Param('staffId') staffId: string,
    @Query('date') date: string,
  ): Promise<T[]> {
    const queryDate = new Date(date);
    return this.service.findByStaffIdAndDate(staffId, queryDate);
  }

  @ApiOperation({ summary: '建立新工時記錄' })
  @ApiResponse({
    status: 201,
    description: '成功建立工時記錄',
    type: Object,
  })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createManhourDto: Partial<T>): Promise<T> {
    return this.service.create(createManhourDto);
  }

  @ApiOperation({ summary: '更新工時記錄' })
  @ApiParam({ name: 'id', description: '工時記錄ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功更新工時記錄',
    type: Object,
  })
  @ApiResponse({ status: 404, description: '工時記錄不存在' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateManhourDto: Partial<T>,
  ): Promise<T | null> {
    return this.service.update(id, updateManhourDto);
  }

  @ApiOperation({ summary: '刪除工時記錄' })
  @ApiParam({ name: 'id', description: '工時記錄ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除工時記錄' })
  @ApiResponse({ status: 404, description: '工時記錄不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }

  // 抽象方法，子類別需要實作以提供查詢別名
  protected abstract getQueryAlias(): string;
}
