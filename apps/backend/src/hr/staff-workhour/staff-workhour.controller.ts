import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { StaffWorkhour } from './entities/staff-workhour.entity';
import { StaffWorkhourService } from './staff-workhour.service';

export class CalculateStaffWorkhourDto {
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  staffId?: string;
}

export class CalculateStaffWorkhourRangeDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

@ApiTags('員工日工時與薪資')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('staff-workhours')
export class StaffWorkhourController {
  constructor(private readonly service: StaffWorkhourService) {}

  @Get()
  @ApiOperation({ summary: '取得員工日工時分頁資料' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-06-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-06-30' })
  @ApiQuery({ name: 'staffId', required: false, example: 'A001' })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.service.findAll(
      page,
      limit,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      staffId,
    );
  }

  @Get('date-range')
  @ApiOperation({ summary: '查詢日期範圍內的日工時' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('staffId') staffId?: string,
  ): Promise<StaffWorkhour[]> {
    return this.service.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      staffId,
    );
  }

  @Get('payroll')
  @ApiOperation({ summary: '取得日期範圍薪資摘要' })
  payroll(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.payroll(new Date(startDate), new Date(endDate));
  }

  @Post('calculate')
  @ApiOperation({ summary: '計算指定日期的員工日工時' })
  calculate(@Body() dto: CalculateStaffWorkhourDto) {
    return this.service.calculate(new Date(dto.date), dto.staffId);
  }

  @Post('calculate-range')
  @ApiOperation({ summary: '計算日期範圍的員工日工時' })
  calculateRange(@Body() dto: CalculateStaffWorkhourRangeDto) {
    return this.service.calculateRange(
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffWorkhour> {
    return this.service.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: '員工日工時已刪除' };
  }
}
