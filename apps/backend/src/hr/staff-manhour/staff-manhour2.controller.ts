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
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { RequireFeature } from '../../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../../auth/entities/user-feature.entity';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { CopyManhourDto, CreateManhour2Dto, Manhour2QueryDto, UpdateManhour2Dto } from './dto/staff-manhour2.dto';

/** 外帳工時屬薪資範圍，沿用 hr-payroll 權限（規劃文件 3.7）。 */
export const MANHOUR2_FEATURE = 'hr-payroll';

@ApiTags('員工工時管理 (外帳)')
@ApiBearerAuth('JWT-auth')
@Controller('staff-manhours2')
@UseGuards(JwtAuthGuard, FeatureGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
export class StaffManhour2Controller {
  constructor(private readonly service: StaffManhour2Service) {}

  @Get()
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '查詢外帳工時；給 name/from/to 時依條件查，否則分頁列出' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, type: [StaffManhour2] })
  find(
    @Query() query: Manhour2QueryDto,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (query.name || query.from || query.to) return this.service.search(query);
    return this.service.findAll(page, limit);
  }

  @Get('by-name/:name')
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '根據員工姓名查詢' })
  @ApiParam({ name: 'name', example: '張三' })
  findByName(@Param('name') name: string) {
    return this.service.findByName(name);
  }

  @Get(':id')
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '單筆外帳工時' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('copy-from-manhour')
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '把 staff_manhour 同期間區間複製到外帳；只新增不覆寫' })
  @ApiResponse({ status: 201, description: 'copied / skipped / rows' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  copyFromManhour(@Body() dto: CopyManhourDto) {
    return this.service.copyFromManhour(dto);
  }

  @Post()
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '新增外帳工時' })
  @ApiResponse({ status: 201, type: StaffManhour2 })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  create(@Body() dto: CreateManhour2Dto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '修改外帳工時起訖時間' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '不存在' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateManhour2Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireFeature(MANHOUR2_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '刪除外帳工時' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 404, description: '不存在' })
  @ApiResponse({ status: 409, description: '期間已有定稿薪資' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: '外帳工時已刪除' };
  }
}
