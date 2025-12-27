import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';

@ApiTags('員工管理')
@Controller('staffs') // 路由前綴為 /staffs
export class StaffController {
  constructor(private readonly usersService: StaffService) {}

  @ApiOperation({ summary: '獲取所有員工' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回員工列表', type: [Staff] })
  @Get() // 處理 GET 請求，返回所有用戶
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據ID獲取單個員工' })
  @ApiParam({ name: 'id', description: '员工ID', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功返回员工信息', type: Staff })
  @ApiResponse({ status: 404, description: '员工不存在' })
  @Get(':id') // 處理 GET 請求，返回單一用戶
  findOne(@Param('id') id: string): Promise<Staff | null> {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: '建立新員工' })
  @ApiResponse({ status: 201, description: '成功建立員工', type: Staff })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
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

  @ApiOperation({ summary: '更新員工資料' })
  @ApiParam({ name: 'id', description: '員工ID', example: 'STAFF001' })
  @ApiResponse({ status: 200, description: '成功更新員工資料', type: Staff })
  @ApiResponse({ status: 404, description: '員工不存在' })
  @Post(':id') // 處理 PUT 請求，更新用戶
  update(
    @Param('id') id: string,
    @Body() data: Partial<Staff>,
  ): Promise<Staff | null> {
    return this.usersService.update(id, data);
  }
}
