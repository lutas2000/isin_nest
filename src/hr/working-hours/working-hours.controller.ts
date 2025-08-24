import {
  Controller,
  Post,
  Get,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { WorkingHoursService } from './working-hours.service';

export class CalculateWorkingHoursDto {
  date: string; // YYYY-MM-DD 格式
}

export class CalculateRangeDto {
  startDate: string; // YYYY-MM-DD 格式
  endDate: string; // YYYY-MM-DD 格式
}

export class StaffBreakTimeDto {
  staffName: string;
  date: string; // YYYY-MM-DD 格式
  workStartTime: string; // ISO 8601 格式
  workEndTime: string; // ISO 8601 格式
}

@ApiTags('工時計算管理')
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Post('calculate')
  @ApiOperation({ summary: '計算指定日期的完整工時' })
  @ApiBody({ type: CalculateWorkingHoursDto })
  @ApiResponse({ status: 200, description: '成功計算工時' })
  @ApiResponse({ status: 500, description: '計算工時失敗' })
  async calculateWorkingHours(
    @Body() dto: CalculateWorkingHoursDto,
  ): Promise<{ message: string }> {
    const date = new Date(dto.date);
    await this.workingHoursService.calculateCompleteWorkingHours(date);

    return {
      message: `成功計算 ${dto.date} 的工時`,
    };
  }

  @Post('calculate-range')
  @ApiOperation({ summary: '重新計算指定日期範圍的工時' })
  @ApiBody({ type: CalculateRangeDto })
  @ApiResponse({ status: 200, description: '成功重新計算日期範圍工時' })
  @ApiResponse({ status: 500, description: '重新計算工時失敗' })
  async calculateWorkingHoursRange(
    @Body() dto: CalculateRangeDto,
  ): Promise<{ message: string }> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    await this.workingHoursService.recalculateWorkingHoursRange(
      startDate,
      endDate,
    );

    return {
      message: `成功重新計算 ${dto.startDate} 到 ${dto.endDate} 的工時`,
    };
  }

  @Post('calculate-break-time')
  @ApiOperation({ summary: '計算員工休息時間' })
  @ApiBody({ type: StaffBreakTimeDto })
  @ApiResponse({ status: 200, description: '成功計算休息時間' })
  @ApiResponse({ status: 500, description: '計算休息時間失敗' })
  async calculateStaffBreakTime(
    @Body() dto: StaffBreakTimeDto,
  ): Promise<{ breakMinutes: number; breakHours: number }> {
    const date = new Date(dto.date);
    const workStartTime = new Date(dto.workStartTime);
    const workEndTime = new Date(dto.workEndTime);

    const breakMinutes = await this.workingHoursService.calculateStaffBreakTime(
      dto.staffName,
      date,
      workStartTime,
      workEndTime,
    );

    return {
      breakMinutes,
      breakHours: Number((breakMinutes / 60).toFixed(2)),
    };
  }

  @Get('staff-segment-info')
  @ApiOperation({ summary: '取得員工段別設定資訊' })
  @ApiQuery({ name: 'staffName', description: '員工姓名', example: '張三' })
  @ApiQuery({
    name: 'date',
    description: '日期 (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiResponse({ status: 200, description: '成功取得段別設定資訊' })
  @ApiResponse({ status: 500, description: '取得段別設定資訊失敗' })
  async getStaffSegmentInfo(
    @Query('staffName') staffName: string,
    @Query('date') date: string,
  ): Promise<{ segmentInfo: string }> {
    const dateObj = new Date(date);
    const segmentInfo = await this.workingHoursService.getStaffSegmentInfo(
      staffName,
      dateObj,
    );

    return { segmentInfo };
  }

  @Post('process-staff-attendance')
  @ApiOperation({ summary: '處理指定員工的打卡記錄類型' })
  @ApiBody({ type: StaffBreakTimeDto })
  @ApiResponse({ status: 200, description: '成功處理打卡記錄' })
  @ApiResponse({ status: 500, description: '處理打卡記錄失敗' })
  async processStaffAttendance(
    @Body() dto: StaffBreakTimeDto,
  ): Promise<{ message: string }> {
    const date = new Date(dto.date);

    await this.workingHoursService.processStaffAttendanceRecords(
      dto.staffName,
      date,
    );

    return {
      message: `成功處理員工 ${dto.staffName} 在 ${dto.date} 的打卡記錄`,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: '取得工時統計摘要' })
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
  @ApiResponse({ status: 200, description: '成功取得工時統計摘要' })
  @ApiResponse({ status: 500, description: '取得工時統計摘要失敗' })
  async getWorkingHoursSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<{
    totalStaff: number;
    totalWorkHours: number;
    averageWorkHours: number;
    incompleteRecords: number;
  }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return await this.workingHoursService.getWorkingHoursSummary(start, end);
  }

  @Get('incomplete-records')
  @ApiOperation({ summary: '檢查未完成的工時記錄' })
  @ApiResponse({ status: 200, description: '成功檢查未完成工時記錄' })
  @ApiResponse({ status: 500, description: '檢查未完成工時記錄失敗' })
  async checkIncompleteWorkHours(): Promise<{
    hasIncompleteRecords: boolean;
    record?: unknown;
  }> {
    const undoneRecord =
      await this.workingHoursService.checkIncompleteWorkHours();

    return {
      hasIncompleteRecords: !!undoneRecord,
      record: undoneRecord,
    };
  }

  @Get('system-status')
  @ApiOperation({ summary: '取得系統狀態資訊' })
  @ApiResponse({ status: 200, description: '成功取得系統狀態資訊' })
  @ApiResponse({ status: 500, description: '取得系統狀態資訊失敗' })
  async getSystemStatus(): Promise<{
    lastProcessedDate: Date | null;
    totalStaffCount: number;
    incompleteRecordsCount: number;
    systemHealth: string;
  }> {
    return await this.workingHoursService.getSystemStatus();
  }

  @Post('today')
  @ApiOperation({ summary: '計算今日工時' })
  @ApiResponse({ status: 200, description: '成功計算今日工時' })
  @ApiResponse({ status: 500, description: '計算今日工時失敗' })
  async calculateTodayWorkingHours(): Promise<{ message: string }> {
    const today = new Date();
    await this.workingHoursService.calculateCompleteWorkingHours(today);

    return {
      message: `成功計算 ${today.toISOString().split('T')[0]} 的工時`,
    };
  }

  @Post('yesterday')
  @ApiOperation({ summary: '計算昨日工時' })
  @ApiResponse({ status: 200, description: '成功計算昨日工時' })
  @ApiResponse({ status: 500, description: '計算昨日工時失敗' })
  async calculateYesterdayWorkingHours(): Promise<{ message: string }> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await this.workingHoursService.calculateCompleteWorkingHours(yesterday);

    return {
      message: `成功計算 ${yesterday.toISOString().split('T')[0]} 的工時`,
    };
  }
}
