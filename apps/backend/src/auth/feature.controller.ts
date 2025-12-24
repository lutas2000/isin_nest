import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { CreateFeatureDto } from './dto/feature.dto';
import { getPermissionTypes } from './config/permissions.config';
import {
  getAllFeatures,
  getFeaturesByModule,
  getAllModules,
} from './config/features.config';

@ApiTags('功能管理')
@Controller('auth/features')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @ApiOperation({ summary: '取得所有功能' })
  @ApiResponse({ status: 200, description: '成功返回功能列表' })
  @Get()
  async findAll() {
    return this.featureService.findAll();
  }

  @ApiOperation({ summary: '創建新功能' })
  @ApiResponse({ status: 201, description: '成功創建功能' })
  @Post()
  async create(@Body() createDto: CreateFeatureDto) {
    return this.featureService.create(createDto);
  }

  @ApiOperation({ summary: '取得所有權限類型' })
  @ApiResponse({ status: 200, description: '成功返回權限類型列表' })
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  getPermissions() {
    return getPermissionTypes();
  }

  @ApiOperation({ summary: '取得所有功能列表' })
  @ApiResponse({ status: 200, description: '成功返回功能列表' })
  @ApiQuery({
    name: 'module',
    required: false,
    description: '根據模組篩選功能（例如：crm, hr）',
  })
  @UseGuards(JwtAuthGuard)
  @Get('list')
  getFeaturesList(@Query('module') module?: string) {
    if (module) {
      return getFeaturesByModule(module);
    }
    return getAllFeatures();
  }

  @ApiOperation({ summary: '取得所有模組列表' })
  @ApiResponse({ status: 200, description: '成功返回模組列表' })
  @UseGuards(JwtAuthGuard)
  @Get('modules')
  getModules() {
    return getAllModules();
  }
}

