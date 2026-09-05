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
import { StaffAuthorityService } from './staff-authority.service';
import { StaffAuthority } from './entities/staff-authority.entity';

@ApiTags('員工權限設定')
@Controller('staff-authorities')
export class StaffAuthorityController {
  constructor(private readonly service: StaffAuthorityService) {}

  @Get()
  @ApiOperation({ summary: '取得所有員工權限設定' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.service.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得單一員工權限設定' })
  findOne(@Param('id') id: string): Promise<StaffAuthority> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '建立員工權限設定' })
  create(@Body() dto: Partial<StaffAuthority>): Promise<StaffAuthority> {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新員工權限設定' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<StaffAuthority>,
  ): Promise<StaffAuthority> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除員工權限設定' })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
