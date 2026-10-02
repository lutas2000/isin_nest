import {
  BadRequestException,
  Controller,
  HttpCode,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LegacyStaffService } from './legacy-staff.service';

@ApiTags('舊版 Staff 相容流程')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: '未登入或 token 無效' })
@ApiResponse({ status: 403, description: '非管理員' })
@ApiResponse({ status: 409, description: '已有流程執行中' })
@ApiResponse({ status: 503, description: '舊 MariaDB 尚未設定' })
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('staff')
export class LegacyStaffController {
  constructor(private readonly service: LegacyStaffService) {}

  @Post('import')
  @HttpCode(200)
  @ApiOperation({ summary: '匯入 M70 未讀打卡，提交 MariaDB 後標記已讀；重試尚未連結員工的保存紀錄' })
  @ApiResponse({ status: 200, description: 'succeed' })
  async import(@Res() response: Response): Promise<void> {
    await this.service.import();
    response.type('text/plain').send('succeed');
  }

  @Post('appoint')
  @HttpCode(200)
  @ApiOperation({ summary: '依 Django 規則決定尚未分類的上下班打卡' })
  @ApiResponse({ status: 200, description: 'appoint_attend_type succeed' })
  async appoint(@Res() response: Response): Promise<void> {
    await this.service.appoint();
    response.type('text/plain').send('appoint_attend_type succeed');
  }

  @Post('work_hour/today')
  @HttpCode(200)
  @ApiOperation({ summary: '匯入、分類並重算昨日與今日工時' })
  @ApiResponse({ status: 200, description: 'succeed' })
  async today(@Res() response: Response): Promise<void> {
    await this.service.today();
    response.type('text/plain').send('succeed');
  }

  @Post('work_hour/:start_time')
  @HttpCode(200)
  @ApiOperation({ summary: '從指定日期重算至今日的工時' })
  @ApiParam({
    name: 'start_time',
    example: '2026-09-28',
    description: 'YYYY-MM-DD',
  })
  @ApiResponse({ status: 200, description: 'succeed' })
  @ApiResponse({ status: 400, description: '日期格式錯誤' })
  async recalculate(
    @Param('start_time') startTime: string,
    @Res() response: Response,
  ): Promise<void> {
    const date = new Date(`${startTime}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startTime) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== startTime
    ) {
      throw new BadRequestException(
        'start_time must be a valid YYYY-MM-DD date',
      );
    }
    await this.service.recalculateFrom(startTime);
    response.type('text/plain').send('succeed');
  }
}
