import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { Contact } from './entities/contact.entity';

@ApiTags('聯絡人管理')
@Controller('crm/contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @ApiOperation({ summary: '獲取所有聯絡人' })
  @ApiQuery({ name: 'customerId', required: false, description: '客戶ID' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiQuery({ name: 'search', required: false, description: '搜尋關鍵字（聯絡人姓名、客戶名稱）', example: '張三' })
  @ApiResponse({ status: 200, description: '成功返回聯絡人列表', type: [Contact] })
  @Get()
  findAll(
    @Query('customerId') customerId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    if (customerId) {
      return this.contactService.findByCustomerId(customerId, page, limit, search);
    }
    return this.contactService.findAll(page, limit, search);
  }

  @ApiOperation({ summary: '根據ID獲取單個聯絡人' })
  @ApiParam({ name: 'id', description: '聯絡人ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回聯絡人信息', type: Contact })
  @ApiResponse({ status: 404, description: '聯絡人不存在' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Contact | null> {
    return this.contactService.findOne(+id);
  }

  @ApiOperation({ summary: '建立新聯絡人' })
  @ApiResponse({ status: 201, description: '成功建立聯絡人', type: Contact })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createContactDto: Partial<Contact>): Promise<Contact> {
    return this.contactService.create(createContactDto);
  }

  @ApiOperation({ summary: '刪除聯絡人' })
  @ApiParam({ name: 'id', description: '聯絡人ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除聯絡人' })
  @ApiResponse({ status: 404, description: '聯絡人不存在' })
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.contactService.remove(+id);
  }

  @ApiOperation({ summary: '更新聯絡人資料' })
  @ApiParam({ name: 'id', description: '聯絡人ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新聯絡人資料', type: Contact })
  @ApiResponse({ status: 404, description: '聯絡人不存在' })
  @Post(':id')
  update(
    @Param('id') id: string,
    @Body() data: Partial<Contact>,
  ): Promise<Contact | null> {
    return this.contactService.update(+id, data);
  }
}

