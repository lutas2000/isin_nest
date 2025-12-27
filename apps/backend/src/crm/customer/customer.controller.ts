import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { Customer } from './entities/customer.entity';

@ApiTags('客戶管理')
@Controller('crm/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({ summary: '獲取所有客戶' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiQuery({ name: 'search', required: false, description: '搜尋關鍵字（客戶ID、公司名稱、公司簡稱）', example: '台灣' })
  @ApiResponse({ status: 200, description: '成功返回客戶列表', type: [Customer] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.customerService.findAll(page, limit, search);
  }

  @ApiOperation({ summary: '根據ID獲取單個客戶' })
  @ApiParam({ name: 'id', description: '客戶ID', example: 'CUST001' })
  @ApiResponse({ status: 200, description: '成功返回客戶信息', type: Customer })
  @ApiResponse({ status: 404, description: '客戶不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Customer | null> {
    return this.customerService.findOne(id);
  }

  @ApiOperation({ summary: '建立新客戶' })
  @ApiResponse({ status: 201, description: '成功建立客戶', type: Customer })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createCustomerDto: Partial<Customer>): Promise<Customer> {
    return this.customerService.create(createCustomerDto);
  }

  @ApiOperation({ summary: '刪除客戶' })
  @ApiParam({ name: 'id', description: '客戶ID', example: 'CUST001' })
  @ApiResponse({ status: 200, description: '成功刪除客戶' })
  @ApiResponse({ status: 404, description: '客戶不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.customerService.remove(id);
  }

  @ApiOperation({ summary: '更新客戶資料' })
  @ApiParam({ name: 'id', description: '客戶ID', example: 'CUST001' })
  @ApiResponse({ status: 200, description: '成功更新客戶資料', type: Customer })
  @ApiResponse({ status: 404, description: '客戶不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Customer>,
  ): Promise<Customer | null> {
    return this.customerService.update(id, data);
  }
}

