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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { CreateStaffLeaveDto } from './dto/create-staff-leave.dto';
import { ReviewStaffLeaveDto } from './dto/review-staff-leave.dto';
import { UpdateStaffLeaveDto } from './dto/update-staff-leave.dto';
import { LeaveStatus, StaffLeave } from './entities/staff-leave.entity';
import { StaffLeaveService } from './staff-leave.service';

@ApiTags('員工請假管理')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('staff-leaves')
export class StaffLeaveController {
  constructor(private readonly staffLeaveService: StaffLeaveService) {}

  @ApiOperation({ summary: '獲取所有請假記錄' })
  @ApiResponse({ status: 200, description: '成功返回請假記錄列表' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'status', required: false, enum: LeaveStatus })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: LeaveStatus,
  ) {
    return this.staffLeaveService.findAll(page, limit, status);
  }

  @ApiOperation({ summary: '根據日期範圍查詢請假記錄' })
  @ApiQuery({ name: 'startDate', example: '2023-01-01' })
  @ApiQuery({ name: 'endDate', example: '2023-12-31' })
  @Get('by-date-range')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StaffLeave[]> {
    return this.staffLeaveService.findByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @ApiOperation({ summary: '根據員工 ID 獲取請假記錄' })
  @ApiParam({ name: 'staffId', example: 'STAFF001' })
  @Get('by-staff/:staffId')
  findByStaffId(@Param('staffId') staffId: string): Promise<StaffLeave[]> {
    return this.staffLeaveService.findByStaffId(staffId);
  }

  @ApiOperation({ summary: '根據員工姓名獲取請假記錄' })
  @ApiParam({ name: 'name', example: '張三' })
  @Get('by-name/:name')
  findByStaffName(@Param('name') name: string): Promise<StaffLeave[]> {
    return this.staffLeaveService.findByStaffName(name);
  }

  @ApiOperation({ summary: '根據請假類型獲取記錄' })
  @ApiParam({ name: 'type', example: '特休' })
  @Get('by-type/:type')
  findByType(@Param('type') type: string): Promise<StaffLeave[]> {
    return this.staffLeaveService.findByType(type);
  }

  @ApiOperation({ summary: '根據 ID 獲取單一請假記錄' })
  @ApiParam({ name: 'id', example: 1 })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffLeave> {
    return this.staffLeaveService.findOne(id);
  }

  @ApiOperation({ summary: '建立新的請假記錄，時數由後端自動計算' })
  @ApiResponse({ status: 201, type: StaffLeave })
  @Post()
  create(@Body() dto: CreateStaffLeaveDto): Promise<StaffLeave> {
    return this.staffLeaveService.create(dto);
  }

  @ApiOperation({ summary: '更新待審核請假記錄' })
  @ApiParam({ name: 'id', example: 1 })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffLeaveDto,
  ): Promise<StaffLeave> {
    return this.staffLeaveService.update(id, dto);
  }

  @ApiOperation({ summary: '核准請假' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewStaffLeaveDto,
    @Request() request: { user?: { userName?: string; staff?: { id: string } } },
  ): Promise<StaffLeave> {
    return this.staffLeaveService.approve(
      id,
      this.getRequesterStaffId(request),
      dto.note,
    );
  }

  @ApiOperation({ summary: '拒絕請假' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewStaffLeaveDto,
    @Request() request: { user?: { userName?: string; staff?: { id: string } } },
  ): Promise<StaffLeave> {
    return this.staffLeaveService.reject(
      id,
      this.getRequesterStaffId(request),
      dto.note,
    );
  }

  @ApiOperation({ summary: '刪除待審核請假記錄' })
  @ApiParam({ name: 'id', example: 1 })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.staffLeaveService.remove(id);
  }

  private getRequesterStaffId(request: {
    user?: { userName?: string; staff?: { id: string } };
  }): string {
    const staffId = request.user?.staff?.id || request.user?.userName;
    if (!staffId) throw new UnauthorizedException('找不到審核者員工 ID');
    return staffId;
  }
}
