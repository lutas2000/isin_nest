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
  AttendRecordService,
  CreateAttendRecordDto,
  UpdateAttendRecordDto,
} from './attend-record.service';
import { AttendRecord } from './entities/attend-record.entity';

@ApiTags('出勤記錄管理')
@Controller('attend-record')
export class AttendRecordController {
  constructor(private readonly attendRecordService: AttendRecordService) {}

  @Post()
  @ApiOperation({ summary: '建立出勤記錄' })
  @ApiResponse({
    status: 201,
    description: '成功建立出勤記錄',
    type: AttendRecord,
  })
  @ApiResponse({
    status: 400,
    description: '請求參數錯誤或業務規則驗證失敗',
    schema: {
      example: {
        statusCode: 400,
        message: '今日已有上班打卡記錄，請勿重複打卡',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '員工不存在',
    schema: {
      example: {
        statusCode: 404,
        message: '員工 STAFF999 不存在',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Body() createAttendRecordDto: CreateAttendRecordDto,
  ): Promise<AttendRecord> {
    return await this.attendRecordService.create(createAttendRecordDto);
  }

  @Get()
  @ApiOperation({ summary: '取得所有出勤記錄' })
  @ApiResponse({
    status: 200,
    description: '成功取得出勤記錄列表',
    type: [AttendRecord],
  })
  @ApiQuery({
    name: 'staffId',
    required: false,
    description: '根據員工編號篩選',
  })
  @ApiQuery({
    name: 'attendType',
    required: false,
    description: '根據出勤類型篩選 0:未決定 1:上班 2:下班',
    enum: [0, 1, 2],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: '開始日期 (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: '結束日期 (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '頁碼 (預設: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每頁筆數 (預設: 50, 最大: 100)',
    example: 20,
  })
  async findAll(
    @Query('staffId') staffId?: string,
    @Query('attendType', new ParseIntPipe({ optional: true }))
    attendType?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<AttendRecord[]> {
    // 如果有日期範圍查詢
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (staffId) {
        return await this.attendRecordService.findByStaffIdAndDateRange(
          staffId,
          start,
          end,
        );
      } else {
        return await this.attendRecordService.findByDateRange(start, end);
      }
    }

    // 如果只有員工ID
    if (staffId) {
      return await this.attendRecordService.findByStaffId(staffId);
    }

    // 如果只有出勤類型
    if (attendType !== undefined) {
      return await this.attendRecordService.findByAttendType(attendType);
    }

    // 沒有任何篩選條件，返回所有記錄（支援分頁）
    return await this.attendRecordService.findAll(page, limit);
  }

  @Get('today/:staffId')
  @ApiOperation({ summary: '取得特定員工今日出勤記錄' })
  @ApiParam({ name: 'staffId', description: '員工編號' })
  @ApiResponse({
    status: 200,
    description: '成功取得今日出勤記錄',
    type: [AttendRecord],
  })
  async findTodayByStaffId(
    @Param('staffId') staffId: string,
  ): Promise<AttendRecord[]> {
    return await this.attendRecordService.findTodayByStaffId(staffId);
  }

  @Get(':id')
  @ApiOperation({ summary: '根據ID取得出勤記錄' })
  @ApiParam({ name: 'id', description: '出勤記錄ID' })
  @ApiResponse({
    status: 200,
    description: '成功取得出勤記錄',
    type: AttendRecord,
  })
  @ApiResponse({ status: 404, description: '出勤記錄不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AttendRecord> {
    return await this.attendRecordService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新出勤記錄' })
  @ApiParam({ name: 'id', description: '出勤記錄ID' })
  @ApiResponse({
    status: 200,
    description: '成功更新出勤記錄',
    type: AttendRecord,
  })
  @ApiResponse({ status: 404, description: '出勤記錄不存在' })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttendRecordDto: UpdateAttendRecordDto,
  ): Promise<AttendRecord> {
    return await this.attendRecordService.update(id, updateAttendRecordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除出勤記錄' })
  @ApiParam({ name: 'id', description: '出勤記錄ID' })
  @ApiResponse({ status: 200, description: '成功刪除出勤記錄' })
  @ApiResponse({ status: 404, description: '出勤記錄不存在' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.attendRecordService.remove(id);
    return { message: '出勤記錄已成功刪除' };
  }

  @Post('process-files')
  @ApiOperation({ summary: '手動處理出勤記錄檔案' })
  @ApiQuery({
    name: 'fileType',
    required: false,
    enum: ['csv', 'usb', 'all'],
    description: '檔案類型 (csv: CSV檔案, usb: USB檔案, all: 全部檔案)',
    example: 'all',
  })
  @ApiResponse({ status: 200, description: '成功處理出勤記錄檔案' })
  @ApiResponse({ status: 500, description: '處理檔案時發生錯誤' })
  async processFiles(
    @Query('fileType') fileType?: 'csv' | 'usb' | 'all',
  ): Promise<{ message: string }> {
    await this.attendRecordService.manualProcessFiles(fileType);
    return {
      message: `成功處理${fileType === 'csv' ? 'CSV' : fileType === 'usb' ? 'USB' : '所有'}出勤記錄檔案`,
    };
  }

  @Post('process-csv')
  @ApiOperation({ summary: '處理 CSV 出勤記錄檔案' })
  @ApiResponse({ status: 200, description: '成功處理 CSV 檔案' })
  @ApiResponse({ status: 500, description: '處理檔案時發生錯誤' })
  async processCsvFiles(): Promise<{ message: string }> {
    await this.attendRecordService.processCsvFiles();
    return { message: '成功處理 CSV 出勤記錄檔案' };
  }

  @Post('process-usb')
  @ApiOperation({ summary: '處理 USB 出勤記錄檔案' })
  @ApiResponse({ status: 200, description: '成功處理 USB 檔案' })
  @ApiResponse({ status: 500, description: '處理檔案時發生錯誤' })
  async processUsbFiles(): Promise<{ message: string }> {
    await this.attendRecordService.processUsbFile();
    return { message: '成功處理 USB 出勤記錄檔案' };
  }
}
