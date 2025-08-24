import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import {
  StaffSegmentService,
  CreateStaffSegmentDto,
  UpdateStaffSegmentDto,
} from './staff-segment.service';
import { StaffSegment } from './entities/staff-segment.entity';

@ApiTags('員工段別管理')
@Controller('staff-segment')
export class StaffSegmentController {
  constructor(private readonly staffSegmentService: StaffSegmentService) {}

  @Post()
  @ApiOperation({ summary: '新增員工段別設定' })
  @ApiResponse({
    status: 201,
    description: '成功新增員工段別設定',
    type: StaffSegment,
  })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  async create(
    @Body() createStaffSegmentDto: CreateStaffSegmentDto,
  ): Promise<StaffSegment> {
    return await this.staffSegmentService.create(createStaffSegmentDto);
  }

  @Get()
  @ApiOperation({ summary: '取得所有員工段別設定' })
  @ApiResponse({
    status: 200,
    description: '成功取得員工段別設定列表',
    type: [StaffSegment],
  })
  async findAll(): Promise<StaffSegment[]> {
    return await this.staffSegmentService.findAll();
  }

  @Get('staff/:staffId')
  @ApiOperation({ summary: '根據員工編號取得段別設定' })
  @ApiParam({ name: 'staffId', description: '員工編號', example: 'STAFF001' })
  @ApiResponse({
    status: 200,
    description: '成功取得指定員工的段別設定',
    type: [StaffSegment],
  })
  async findByStaffId(
    @Param('staffId') staffId: string,
  ): Promise<StaffSegment[]> {
    return await this.staffSegmentService.findByStaffId(staffId);
  }

  @Get('date-range')
  @ApiOperation({ summary: '根據日期範圍查詢員工段別設定' })
  @ApiQuery({
    name: 'startDate',
    description: '開始日期',
    example: '2024-01-01',
  })
  @ApiQuery({ name: 'endDate', description: '結束日期', example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: '成功取得指定日期範圍的員工段別設定',
    type: [StaffSegment],
  })
  @ApiResponse({ status: 400, description: '日期格式錯誤' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StaffSegment[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await this.staffSegmentService.findByDateRange(start, end);
  }

  @Get(':id')
  @ApiOperation({ summary: '根據ID取得員工段別設定' })
  @ApiParam({ name: 'id', description: '段別設定ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功取得員工段別設定',
    type: StaffSegment,
  })
  @ApiResponse({ status: 404, description: '找不到指定的員工段別設定' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffSegment> {
    return await this.staffSegmentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新員工段別設定' })
  @ApiParam({ name: 'id', description: '段別設定ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功更新員工段別設定',
    type: StaffSegment,
  })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  @ApiResponse({ status: 404, description: '找不到指定的員工段別設定' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStaffSegmentDto: UpdateStaffSegmentDto,
  ): Promise<StaffSegment> {
    return await this.staffSegmentService.update(id, updateStaffSegmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除員工段別設定' })
  @ApiParam({ name: 'id', description: '段別設定ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除員工段別設定' })
  @ApiResponse({ status: 404, description: '找不到指定的員工段別設定' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.staffSegmentService.remove(id);
    return { message: '員工段別設定已成功刪除' };
  }
}
