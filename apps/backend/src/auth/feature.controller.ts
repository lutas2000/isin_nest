import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { CreateFeatureDto } from './dto/feature.dto';

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
}

