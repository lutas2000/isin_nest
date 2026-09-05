import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StaffWorkhourService } from './staff-workhour.service';
import { StaffWorkhour } from './entities/staff-workhour.entity';

@ApiTags('員工工時彙總')
@Controller('staff-workhours')
export class StaffWorkhourController {
  constructor(private readonly service: StaffWorkhourService) {}

  @Get()
  @ApiOperation({ summary: '取得所有工時彙總記錄' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: '依員工姓名查詢工時彙總' })
  findByName(@Param('name') name: string): Promise<StaffWorkhour[]> {
    return this.service.findByName(name);
  }

  @Get('date-range')
  @ApiOperation({ summary: '依日期範圍查詢工時彙總' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<StaffWorkhour[]> {
    return this.service.findByDateRange(new Date(startDate), new Date(endDate));
  }

  @Get(':id')
  @ApiOperation({ summary: '取得單一工時彙總記錄' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffWorkhour> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '建立工時彙總記錄' })
  create(@Body() dto: Partial<StaffWorkhour>): Promise<StaffWorkhour> {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新工時彙總記錄' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<StaffWorkhour>,
  ): Promise<StaffWorkhour> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除工時彙總記錄' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
