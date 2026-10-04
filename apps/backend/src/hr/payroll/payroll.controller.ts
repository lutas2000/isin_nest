import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { RequireFeature } from '../../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../../auth/entities/user-feature.entity';
import {
  CreatePayrollRunDto,
  PreviewPayrollDto,
  QueryPayrollRunsDto,
  UpdatePayrollManualDto,
} from './dto/payroll.dto';
import { PayrollRun } from './entities/payroll-run.entity';
import { PayrollService } from './payroll.service';

export const PAYROLL_FEATURE = 'hr-payroll';

@ApiTags('薪資計算')
@ApiBearerAuth('JWT-auth')
@Controller('hr/payroll')
@UseGuards(JwtAuthGuard, FeatureGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }))
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Post('preview')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '計算薪資但不保存（前端預覽）' })
  @ApiResponse({ status: 201, description: '計算結果與警告' })
  @ApiResponse({ status: 400, description: '期間或手動欄位格式錯誤' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '無 hr-payroll 讀取權限' })
  @ApiResponse({ status: 503, description: '舊 MariaDB 未設定' })
  preview(@Body() dto: PreviewPayrollDto) {
    return this.payroll.preview(dto);
  }

  @Post('runs')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '計算並為每個部門建立一筆 draft 薪資 run（snapshot）' })
  @ApiResponse({ status: 201, description: '建立的 run 清單與警告' })
  @ApiResponse({ status: 400, description: '期間或手動欄位格式錯誤' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '無 hr-payroll 寫入權限' })
  createRuns(@Body() dto: CreatePayrollRunDto, @Request() req: { user?: { id?: number } }) {
    return this.payroll.createRuns(dto, req.user?.id ?? null);
  }

  @Get('runs')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '查詢薪資 run（不含明細與輸入）' })
  @ApiResponse({ status: 200, type: [PayrollRun] })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '無 hr-payroll 讀取權限' })
  findRuns(@Query() query: QueryPayrollRunsDto) {
    return this.payroll.findRuns(query);
  }

  @Get('runs/:id')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.READ)
  @ApiOperation({ summary: '取得薪資 run 含每人與每日明細' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'run、staff、days' })
  @ApiResponse({ status: 404, description: '找不到 run' })
  findRun(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.findRun(id);
  }

  @Patch('runs/:id/manual')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '更新 draft run 的手動欄位並重算薪資項目' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: '重算後的 run 明細' })
  @ApiResponse({ status: 400, description: '手動欄位格式錯誤或員工不在 run 內' })
  @ApiResponse({ status: 404, description: '找不到 run' })
  @ApiResponse({ status: 409, description: 'run 已定稿' })
  updateManual(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePayrollManualDto) {
    return this.payroll.updateManual(id, dto.manual);
  }

  @Post('runs/:id/finalize')
  @RequireFeature(PAYROLL_FEATURE, PermissionType.WRITE)
  @ApiOperation({ summary: '定稿薪資 run；定稿後不可修改' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 201, type: PayrollRun })
  @ApiResponse({ status: 404, description: '找不到 run' })
  @ApiResponse({ status: 409, description: 'run 已定稿' })
  finalize(@Param('id', ParseIntPipe) id: number, @Request() req: { user?: { id?: number } }) {
    return this.payroll.finalize(id, req.user?.id ?? null);
  }
}
