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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2 } from './entities/staff-manhour2.entity';

@ApiTags('員工工時管理 (內帳)')
@Controller('staff-manhours2')
export class StaffManhour2Controller {
  constructor(private readonly service: StaffManhour2Service) {}

  @Get()
  @ApiOperation({ summary: '獲取所有內帳工時記錄' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get('by-name/:name')
  findByName(@Param('name') name: string): Promise<StaffManhour2[]> {
    return this.service.findByName(name);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<StaffManhour2 | null> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Partial<StaffManhour2>): Promise<StaffManhour2> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<StaffManhour2>,
  ): Promise<StaffManhour2 | null> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
