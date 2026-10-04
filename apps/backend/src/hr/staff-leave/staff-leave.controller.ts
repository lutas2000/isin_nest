import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { RequireFeature } from '../../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../../auth/entities/user-feature.entity';
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeave } from './entities/staff-leave.entity';
import {
  CreateStaffLeaveDto,
  LeaveBalanceQueryDto,
  LeaveRangeQueryDto,
  UpdateStaffLeaveDto,
} from './dto/staff-leave.dto';
import { LEAVE_TYPES } from '../payroll/domain/leave-types';

export const LEAVE_FEATURE = 'hr-staff-leave';

type AuthedRequest = { user?: { id?: number } };

@ApiTags('員工請假管理')
@ApiBearerAuth('JWT-auth')
@Controller('staff-leaves')
@UseGuards(JwtAuthGuard, FeatureGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
export class StaffLeaveController {
  constructor(private readonly staffLeaveService: StaffLeaveService) {}

  @Get()
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '獲取所有請假記錄（分頁）' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, type: [StaffLeave] })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.staffLeaveService.findAll(page, limit);
  }

  @Get('types')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '可用假別清單' })
  types(): readonly string[] {
    return LEAVE_TYPES;
  }

  @Get('range')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '期間內的請假記錄（依開始日期，台北），可依員工篩選' })
  @ApiResponse({ status: 200, type: [StaffLeave] })
  @ApiResponse({ status: 400, description: '日期格式錯誤' })
  findInRange(@Query() query: LeaveRangeQueryDto) {
    return this.staffLeaveService.findInRange(query);
  }

  @Get('balance')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '特休（到職日週年區間）與病假（曆年）已用時數' })
  @ApiResponse({ status: 400, description: '找不到員工' })
  balance(@Query() query: LeaveBalanceQueryDto) {
    return this.staffLeaveService.balance(query);
  }

  @Get('defaults')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '員工當日的預設請假時段（最新段別的上下班時間）' })
  @ApiQuery({ name: 'name', example: '張三' })
  @ApiQuery({ name: 'date', example: '2026-06-01' })
  defaults(@Query('name') name: string, @Query('date') date: string) {
    return this.staffLeaveService.defaults(name, date);
  }

  @Get('by-date-range')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據日期範圍查詢請假記錄（舊介面）' })
  @ApiQuery({ name: 'startDate', example: '2023-01-01' })
  @ApiQuery({ name: 'endDate', example: '2023-12-31' })
  findByDateRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.staffLeaveService.findByDateRange(new Date(startDate), new Date(endDate));
  }

  @Get('by-staff/:staffId')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據員工ID獲取請假記錄' })
  @ApiParam({ name: 'staffId', example: 'A01' })
  findByStaffId(@Param('staffId') staffId: string) {
    return this.staffLeaveService.findByStaffId(staffId);
  }

  @Get('by-name/:name')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據員工姓名獲取請假記錄' })
  @ApiParam({ name: 'name', example: '張三' })
  findByStaffName(@Param('name') name: string) {
    return this.staffLeaveService.findByStaffName(name);
  }

  @Get('by-type/:type')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據假別獲取記錄' })
  @ApiParam({ name: 'type', example: '特休' })
  findByType(@Param('type') type: string) {
    return this.staffLeaveService.findByType(type);
  }

  @Get(':id')
  @RequireFeature(LEAVE_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據 ID 獲取單一請假記錄' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffLeaveService.findOne(id);
  }

  @Post()
  @RequireFeature(LEAVE_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '登錄請假；跨日拆成每天一筆，簽核人為登入者' })
  @ApiResponse({ status: 201, description: '建立的全部紀錄', type: [StaffLeave] })
  @ApiResponse({ status: 400, description: '輸入錯誤、找不到員工或段別' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  create(@Body() dto: CreateStaffLeaveDto, @Request() req: AuthedRequest) {
    return this.staffLeaveService.create(dto, req.user?.id ?? null);
  }

  @Put(':id')
  @RequireFeature(LEAVE_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '更新請假記錄（不可跨日）' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffLeaveDto, @Request() req: AuthedRequest) {
    return this.staffLeaveService.update(id, dto, req.user?.id ?? null);
  }

  @Delete(':id')
  @RequireFeature(LEAVE_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '刪除請假記錄' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '請假記錄不存在' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.staffLeaveService.remove(id);
    return { message: '請假記錄已刪除' };
  }
}
