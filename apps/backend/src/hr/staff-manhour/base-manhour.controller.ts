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
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個工時記錄' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<T | null> {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: '根據員工姓名獲取工時記錄' })
  @Get('by-name/:name')
  findByName(@Param('name') name: string): Promise<T[]> {
    return this.service.findByName(name);
  }

  @ApiOperation({ summary: '根據日期範圍查詢工時記錄' })
  @Get('date-range/search')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<T[]> {
    return this.service.findByDateRange(
      new Date(startDate),
      new Date(endDate),
      this.getQueryAlias(),
    );
  }

  @ApiOperation({ summary: '根據員工姓名和日期查詢工時記錄' })
  @Get('by-name/:name/date')
  findByNameAndDate(
    @Param('name') name: string,
    @Query('date') date: string,
  ): Promise<T[]> {
    return this.service.findByNameAndDate(name, new Date(date));
  }

  @Post()
  create(@Body() createManhourDto: Partial<T>): Promise<T> {
    return this.service.create(createManhourDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateManhourDto: Partial<T>,
  ): Promise<T | null> {
    return this.service.update(id, updateManhourDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }

  protected abstract getQueryAlias(): string;
}
