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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeatureConfigService } from './feature-config.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import {
  CreateFeatureConfigDto,
  UpdateFeatureConfigDto,
} from './dto/feature-config.dto';

@ApiTags('權限設定')
@Controller('auth/feature-configs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class FeatureConfigController {
  constructor(
    private readonly featureConfigService: FeatureConfigService,
  ) {}

  @ApiOperation({ summary: '取得所有職稱權限設定' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回設定列表' })
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.featureConfigService.findAll(page, limit);
  }

  @ApiOperation({ summary: '取得單個職稱權限設定' })
  @ApiResponse({ status: 200, description: '成功返回設定' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.featureConfigService.findOne(+id);
  }

  @ApiOperation({ summary: '創建職稱權限設定' })
  @ApiResponse({ status: 201, description: '成功創建設定' })
  @Post()
  async create(@Body() createDto: CreateFeatureConfigDto) {
    return this.featureConfigService.create(createDto);
  }

  @ApiOperation({ summary: '更新職稱權限設定' })
  @ApiResponse({ status: 200, description: '成功更新設定' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateFeatureConfigDto,
  ) {
    return this.featureConfigService.update(+id, updateDto);
  }

  @ApiOperation({ summary: '刪除職稱權限設定' })
  @ApiResponse({ status: 200, description: '成功刪除設定' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.featureConfigService.remove(+id);
  }
}

