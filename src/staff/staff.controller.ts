import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Staff } from './entities/staff.entity';

@Controller('staffs') // 路由前綴為 /staffs
export class StaffController {
  constructor(private readonly usersService: StaffService) {}

  @Get() // 處理 GET 請求，返回所有用戶
  findAll(): Promise<Staff[]> {
    return this.usersService.findAll();
  }

  @Get(':id') // 處理 GET 請求，返回單一用戶
  findOne(@Param('id') id: string): Promise<Staff | null> {
    return this.usersService.findOne(id);
  }

  @Post() // 處理 POST 請求，新增用戶
  create(@Body() createUserDto: Partial<Staff>): Promise<Staff> {
    return this.usersService.create(createUserDto);
  }

  @Delete(':id') // 處理 DELETE 請求，刪除用戶
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
