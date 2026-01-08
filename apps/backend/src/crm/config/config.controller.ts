import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CrmConfigService } from './config.service';
import { CrmConfig } from './entities/crm-config.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { CreateCrmConfigDto, UpdateCrmConfigDto } from './dto/crm-config.dto';

@ApiTags('CRM 設定')
@Controller('crm/configs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class CrmConfigController {
  constructor(private readonly crmConfigService: CrmConfigService) {}

  @ApiOperation({ summary: '取得所有 CRM 設定（分頁）' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回設定列表（分頁）' })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.crmConfigService.findAll(page, limit);
  }

  @ApiOperation({ summary: '取得所有 CRM 設定（無分頁）' })
  @ApiResponse({ status: 200, description: '成功返回所有設定列表', type: [CrmConfig] })
  @Get('all')
  findAllWithoutPagination(): Promise<CrmConfig[]> {
    return this.crmConfigService.findAllWithoutPagination();
  }

  @ApiOperation({ summary: '依分類取得設定' })
  @ApiParam({ name: 'category', description: '設定分類', example: 'shipping_method' })
  @ApiResponse({ status: 200, description: '成功返回該分類的設定', type: [CrmConfig] })
  @Get(':category')
  findByCategory(@Param('category') category: string): Promise<CrmConfig[]> {
    return this.crmConfigService.findByCategory(category);
  }

  @ApiOperation({ summary: '創建 CRM 設定' })
  @ApiResponse({ status: 201, description: '成功創建設定', type: CrmConfig })
  @Post()
  async create(@Body() createDto: CreateCrmConfigDto): Promise<CrmConfig> {
    return this.crmConfigService.create(createDto);
  }

  @ApiOperation({ summary: '更新 CRM 設定' })
  @ApiResponse({ status: 200, description: '成功更新設定', type: CrmConfig })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCrmConfigDto,
  ): Promise<CrmConfig> {
    return this.crmConfigService.update(+id, updateDto);
  }

  @ApiOperation({ summary: '刪除 CRM 設定' })
  @ApiResponse({ status: 200, description: '成功刪除設定' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.crmConfigService.remove(+id);
  }
}


