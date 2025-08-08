import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';

@ApiTags('员工管理')
@Controller('staffs') // 路由前綴為 /staffs
export class StaffController {
  constructor(private readonly usersService: StaffService) {}

  @ApiOperation({ summary: '获取所有员工' })
  @ApiResponse({ status: 200, description: '成功返回员工列表', type: [Staff] })
  @Get() // 處理 GET 請求，返回所有用戶
  findAll(): Promise<Staff[]> {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: '根据ID获取单个员工' })
  @ApiParam({ name: 'id', description: '员工ID', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功返回员工信息', type: Staff })
  @ApiResponse({ status: 404, description: '员工不存在' })
  @Get(':id') // 處理 GET 請求，返回單一用戶
  findOne(@Param('id') id: string): Promise<Staff | null> {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: '创建新员工' })
  @ApiResponse({ status: 201, description: '成功创建员工', type: Staff })
  @ApiResponse({ status: 400, description: '输入数据错误' })
  @Post() // 處理 POST 請求，新增用戶
  create(@Body() createUserDto: Partial<Staff>): Promise<Staff> {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({ summary: '删除员工' })
  @ApiParam({ name: 'id', description: '员工ID', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功删除员工' })
  @ApiResponse({ status: 404, description: '员工不存在' })
  @Delete(':id') // 處理 DELETE 請求，刪除用戶
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @ApiOperation({ summary: '更新员工信息' })
  @ApiParam({ name: 'id', description: '员工ID', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功更新员工信息', type: Staff })
  @ApiResponse({ status: 404, description: '员工不存在' })
  @Post(':id') // 處理 PUT 請求，更新用戶
  update(
    @Param('id') id: string,
    @Body() data: Partial<Staff>,
  ): Promise<Staff | null> {
    return this.usersService.update(id, data);
  }
}
