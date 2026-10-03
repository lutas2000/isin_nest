import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LegacyStaffM70Service } from './legacy-staff-m70.service';

@ApiTags('舊版 Staff M70 員工對照')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 400, description: 'ID、姓名、密碼或 body 格式錯誤' })
@ApiResponse({ status: 401, description: '需要有效 JWT' })
@ApiResponse({ status: 403, description: '限管理員' })
@ApiResponse({ status: 404, description: '指定員工不存在' })
@ApiResponse({ status: 409, description: 'ID 已存在、含歷史資料，或其他設備人員操作執行中' })
@ApiResponse({ status: 503, description: '設備、資料庫或寫入驗證失敗；設備可能已變更，請讀回並同步確認後再重試' })
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

  @Get('device')
  @ApiOperation({ summary: '直接讀取 M70 設備員工 ID 與姓名' })
  @ApiResponse({ status: 200, schema: { type: 'array', items: { type: 'object', properties: { machine_id: { type: 'integer' }, name: { type: 'string', nullable: true } } } } })
  listDeviceUsers() { return this.service.listDeviceUsers(); }

  @Post('device')
  @ApiOperation({ summary: '在 M70 新增密碼員工並讀回驗證；建立未連結的 MariaDB 對照', description: '姓名與密碼必填。ID 必須未出現在設備、mapping 與設備打卡歷史；不支援指紋、人臉、卡片、權限或啟用狀態。成功回傳更新後的 mapping；密碼不回傳。' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, required: ['machine_id', 'name', 'password'], properties: { machine_id: { type: 'integer', minimum: 1, maximum: 4294967295, example: 9999 }, name: { type: 'string', maxLength: 24, example: 'M70測試員工' }, password: { type: 'string', pattern: '^[0-9]+$', writeOnly: true, description: '十進位正整數，最大 4294967295；亦接受 JSON number' } } } })
  @ApiResponse({ status: 201, description: '設備新增及讀回成功，回傳 MariaDB mapping' })
  createDeviceUser(@Body() body: unknown) { return this.service.createDeviceUser(body); }

  @Patch('device/:machineId')
  @ApiParam({ name: 'machineId', type: Number, description: 'M70 人員 ID' })
  @ApiOperation({ summary: '修改 M70 姓名或密碼並更新對照中的設備姓名', description: '至少提供 name 或 password。姓名以設備讀回驗證，密碼以寫入完成回應確認；不執行實際打卡。保留 staff_id、record_name 與原有打卡紀錄。成功回傳更新後的 mapping，不回傳密碼。' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false, properties: { name: { type: 'string', maxLength: 24, example: 'M70測試修改' }, password: { type: 'string', pattern: '^[0-9]+$', writeOnly: true, description: '十進位正整數，最大 4294967295；亦接受 JSON number' } } } })
  @ApiResponse({ status: 200, description: '設備修改及讀回成功，回傳 MariaDB mapping' })
  updateDeviceUser(@Param('machineId') id: string, @Body() body: unknown) { return this.service.updateDeviceUser(id, body); }

  @Delete('device/:machineId')
  @ApiParam({ name: 'machineId', type: Number, description: 'M70 人員 ID' })
  @ApiOperation({ summary: '刪除 M70 的指定員工與其憑證並讀回確認', description: '只刪除指定 ID 的設備 enrollment。保留 MariaDB mapping、人員關聯與歷史打卡，對照標記為設備未見。' })
  @ApiResponse({ status: 200, schema: { type: 'object', properties: { machine_id: { type: 'integer' }, deleted: { type: 'boolean', example: true } } } })
  deleteDeviceUser(@Param('machineId') id: string) { return this.service.deleteDeviceUser(id); }

  @Post(':machineId/rename-device')
  @ApiOperation({ summary: '修改 M70 設備姓名並驗證讀回、保留原始打卡紀錄' })
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
