import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
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
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeave } from './entities/staff-leave.entity';

@ApiTags('員工請假管理')
@Controller('staff-leaves') // 路由前綴為 /staff-leaves
export class StaffLeaveController {
  constructor(private readonly staffLeaveService: StaffLeaveService) {}

  @ApiOperation({ summary: '獲取所有請假記錄' })
  @ApiResponse({
    status: 200,
    description: '成功返回請假記錄列表',
    type: [StaffLeave],
  })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @Get() // 處理 GET 請求，返回所有請假記錄
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return await this.staffLeaveService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據日期範圍查詢請假記錄' })
  @ApiQuery({
    name: 'startDate',
    description: '開始日期',
    example: '2023-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    description: '結束日期',
    example: '2023-12-31',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回日期範圍內的請假記錄',
    type: [StaffLeave],
  })
  @Get('by-date-range') // 處理 GET 請求，根據日期範圍查詢
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StaffLeave[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return await this.staffLeaveService.findByDateRange(start, end);
  }

  @ApiOperation({ summary: '根據員工ID獲取請假記錄' })
  @ApiParam({ name: 'staffId', description: '員工ID', example: 'STAFF001' })
  @ApiResponse({
    status: 200,
    description: '成功返回該員工的請假記錄',
    type: [StaffLeave],
  })
  @Get('by-staff/:staffId') // 處理 GET 請求，根據員工ID查詢
  async findByStaffId(
    @Param('staffId') staffId: string,
  ): Promise<StaffLeave[]> {
    return await this.staffLeaveService.findByStaffId(staffId);
  }

  @ApiOperation({ summary: '根據員工姓名獲取請假記錄' })
  @ApiParam({ name: 'name', description: '員工姓名', example: '張三' })
  @ApiResponse({
    status: 200,
    description: '成功返回該員工的請假記錄',
    type: [StaffLeave],
  })
  @Get('by-name/:name') // 處理 GET 請求，根據姓名查詢
  async findByStaffName(@Param('name') name: string): Promise<StaffLeave[]> {
    return await this.staffLeaveService.findByStaffName(name);
  }

  @ApiOperation({ summary: '根據請假類型獲取記錄' })
  @ApiQuery({ name: 'type', description: '請假類型', example: '特休' })
  @ApiResponse({
    status: 200,
    description: '成功返回該類型的請假記錄',
    type: [StaffLeave],
  })
  @Get('by-type/:type') // 處理 GET 請求，根據類型查詢
  async findByType(@Param('type') type: string): Promise<StaffLeave[]> {
    return await this.staffLeaveService.findByType(type);
  }

  @ApiOperation({ summary: '根據 ID 獲取單一請假記錄' })
  @ApiParam({ name: 'id', description: '請假記錄 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功返回請假記錄',
    type: StaffLeave,
  })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  @Get(':id') // 處理 GET 請求，返回單一請假記錄
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffLeave> {
    return await this.staffLeaveService.findOne(id);
  }

  @ApiOperation({ summary: '建立新的請假記錄' })
  @ApiResponse({
    status: 201,
    description: '成功建立請假記錄',
    type: StaffLeave,
  })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post() // 處理 POST 請求，新增請假記錄
  async create(
    @Body() createStaffLeaveDto: Partial<StaffLeave>,
  ): Promise<StaffLeave> {
    return await this.staffLeaveService.create(createStaffLeaveDto);
  }

  @ApiOperation({ summary: '更新請假記錄' })
  @ApiParam({ name: 'id', description: '請假記錄 ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '成功更新請假記錄',
    type: StaffLeave,
  })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  @Put(':id') // 處理 PUT 請求，更新請假記錄
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStaffLeaveDto: Partial<StaffLeave>,
  ): Promise<StaffLeave> {
    return await this.staffLeaveService.update(id, updateStaffLeaveDto);
  }

  @ApiOperation({ summary: '刪除請假記錄' })
  @ApiParam({ name: 'id', description: '請假記錄 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除請假記錄' })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  @Delete(':id') // 處理 DELETE 請求，刪除請假記錄
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.staffLeaveService.remove(id);
  }
}
