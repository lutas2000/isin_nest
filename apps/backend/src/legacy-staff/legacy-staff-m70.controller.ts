import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';

@ApiTags('舊版 Staff M70 員工對照')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('staff/m70-users')
export class LegacyStaffM70Controller {
  constructor(private readonly service: LegacyStaffM70Service) {}

  @Get()
  @ApiOperation({ summary: '列出 MariaDB 的 M70 員工對照' })
  list() { return this.service.list(); }

  @Get('staff-options')
  @ApiOperation({ summary: '列出可連結的舊 MariaDB 員工' })
  staffOptions() { return this.service.staffOptions(); }

  @Post('sync')
  @ApiOperation({ summary: '唯讀取得 M70 全部員工，單向同步至 MariaDB；保留已指定員工' })
  sync() { return this.service.sync(); }

  @Post(':machineId/rename-device')
  @ApiOperation({ summary: '明確修改 M70 設備姓名，並驗證原始打卡紀錄與未讀數不變' })
  @ApiBody({ schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: '鄭德利' } } } })
  renameDevice(@Param('machineId') id: string, @Body() body: { name?: unknown }) {
    return this.service.renameDevice(id, body);
  }

  @Post()
  @ApiOperation({ summary: '新增 MariaDB 對照列，不修改 M70' })
  @ApiBody({ schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'integer' }, staff_id: { type: 'string', nullable: true } } } })
  create(@Body() body: { machine_id?: unknown; staff_id?: unknown }) {
    return this.service.create(body);
  }

  @Patch(':machineId')
  @ApiOperation({ summary: '修改 MariaDB 人員連結，不修改 M70' })
  @ApiBody({ schema: { type: 'object', required: ['staff_id'], properties: { staff_id: { type: 'string', nullable: true } } } })
  update(@Param('machineId') id: string, @Body() body: { staff_id?: unknown }) {
    return this.service.update(id, body);
  }

  @Delete(':machineId')
  @ApiOperation({ summary: '刪除 MariaDB 對照列，不修改 M70；再次同步會重建設備使用者' })
  remove(@Param('machineId') id: string) { return this.service.remove(id); }
}
