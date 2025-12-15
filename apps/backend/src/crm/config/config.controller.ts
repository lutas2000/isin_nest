import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CrmConfigService } from './config.service';
import { CrmConfig } from './entities/crm-config.entity';

@ApiTags('CRM 設定')
@Controller('crm/configs')
export class CrmConfigController {
  constructor(private readonly crmConfigService: CrmConfigService) {}

  @ApiOperation({ summary: '取得所有 CRM 設定' })
  @ApiResponse({ status: 200, description: '成功返回設定列表', type: [CrmConfig] })
  @Get()
  findAll(): Promise<CrmConfig[]> {
    return this.crmConfigService.findAll();
  }

  @ApiOperation({ summary: '依分類取得設定' })
  @ApiParam({ name: 'category', description: '設定分類', example: 'shipping_method' })
  @ApiResponse({ status: 200, description: '成功返回該分類的設定', type: [CrmConfig] })
  @Get(':category')
  findByCategory(@Param('category') category: string): Promise<CrmConfig[]> {
    return this.crmConfigService.findByCategory(category);
  }
}


