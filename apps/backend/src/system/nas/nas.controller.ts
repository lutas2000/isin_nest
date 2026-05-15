import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { NasService } from './nas.service';

@ApiTags('System - NAS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('system/nas')
export class NasController {
  constructor(private readonly nasService: NasService) {}

  @ApiOperation({ summary: '查詢 NAS 掛載狀態' })
  @Get('status')
  getStatus() {
    return this.nasService.getStatus();
  }

  @ApiOperation({ summary: '掛載所有 NAS 共用資料夾' })
  @Post('mount')
  mountAll() {
    return this.nasService.mountAll();
  }
}
