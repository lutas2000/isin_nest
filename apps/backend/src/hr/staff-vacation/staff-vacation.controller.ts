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
  StaffVacationService,
  CreateStaffVacationDto,
  UpdateStaffVacationDto,
} from './staff-vacation.service';
import { StaffVacation } from './entities/staff-vacation.entity';

@ApiTags('員工假期管理')
@Controller('staff-vacation')
export class StaffVacationController {
  constructor(
    private readonly staffVacationService: StaffVacationService,
  ) {}

  @Post()
  @ApiOperation({ summary: '新增假期記錄' })
  @ApiResponse({
    status: 201,
    description: '成功新增假期記錄',
    type: StaffVacation,
  })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  async create(
    @Body() createStaffVacationDto: CreateStaffVacationDto,
  ): Promise<StaffVacation> {
    return await this.staffVacationService.create(createStaffVacationDto);
  }

  @Get()
  @ApiOperation({ summary: '取得所有假期記錄' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({
    status: 200,
    description: '成功取得假期記錄列表',
    type: [StaffVacation],
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return await this.staffVacationService.findAll(page, limit);
  }

  @Get('date-range')
  @ApiOperation({ summary: '根據日期範圍查詢假期記錄' })
  @ApiQuery({
    name: 'startDate',
    description: '開始日期',
    example: '2024-01-01',
  })
  @ApiQuery({ name: 'endDate', description: '結束日期', example: '2024-12-31' })
  @ApiResponse({
    status: 200,
    description: '成功取得指定日期範圍的假期記錄',
    type: [StaffVacation],
  })
  @ApiResponse({ status: 400, description: '日期格式錯誤' })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StaffVacation[]> {
    return await this.staffVacationService.findByDateRange(startDate, endDate);
  }

  @Get('by-type/:type')
  @ApiOperation({ summary: '根據假別查詢假期記錄' })
  @ApiParam({ name: 'type', description: '假別', example: '國定假日' })
  @ApiResponse({
    status: 200,
    description: '成功取得指定假別的假期記錄',
    type: [StaffVacation],
  })
  async findByType(@Param('type') type: string): Promise<StaffVacation[]> {
    return await this.staffVacationService.findByType(type);
  }

  @Get('by-pay')
  @ApiOperation({ summary: '根據是否支薪查詢假期記錄' })
  @ApiQuery({ name: 'pay', description: '是否支薪', example: true })
  @ApiResponse({
    status: 200,
    description: '成功取得指定支薪狀態的假期記錄',
    type: [StaffVacation],
  })
  async findByPay(@Query('pay') pay: string): Promise<StaffVacation[]> {
    const payBoolean = pay === 'true';
    return await this.staffVacationService.findByPay(payBoolean);
  }

  @Get(':date')
  @ApiOperation({ summary: '根據日期取得假期記錄' })
  @ApiParam({ name: 'date', description: '日期', example: '2024-01-01' })
  @ApiResponse({
    status: 200,
    description: '成功取得假期記錄',
    type: StaffVacation,
  })
  @ApiResponse({ status: 404, description: '找不到指定的假期記錄' })
  async findOne(@Param('date') date: string): Promise<StaffVacation> {
    return await this.staffVacationService.findOne(date);
  }

  @Patch(':date')
  @ApiOperation({ summary: '更新假期記錄' })
  @ApiParam({ name: 'date', description: '日期', example: '2024-01-01' })
  @ApiResponse({
    status: 200,
    description: '成功更新假期記錄',
    type: StaffVacation,
  })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  @ApiResponse({ status: 404, description: '找不到指定的假期記錄' })
  async update(
    @Param('date') date: string,
    @Body() updateStaffVacationDto: UpdateStaffVacationDto,
  ): Promise<StaffVacation> {
    return await this.staffVacationService.update(date, updateStaffVacationDto);
  }

  @Delete(':date')
  @ApiOperation({ summary: '刪除假期記錄' })
  @ApiParam({ name: 'date', description: '日期', example: '2024-01-01' })
  @ApiResponse({ status: 200, description: '成功刪除假期記錄' })
  @ApiResponse({ status: 404, description: '找不到指定的假期記錄' })
  async remove(@Param('date') date: string): Promise<{ message: string }> {
    await this.staffVacationService.remove(date);
    return { message: '假期記錄已成功刪除' };
  }
}

