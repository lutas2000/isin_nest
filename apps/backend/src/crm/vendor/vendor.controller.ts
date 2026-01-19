import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorService } from './vendor.service';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@ApiTags('廠商管理')
@Controller('crm/vendors')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @ApiOperation({ summary: '獲取所有廠商' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiQuery({ name: 'search', required: false, description: '搜尋關鍵字（廠商名稱、聯絡人）', example: '永順' })
  @ApiResponse({ status: 200, description: '成功返回廠商列表', type: [Vendor] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.vendorService.findAll(page, limit, search);
  }

  @ApiOperation({ summary: '獲取所有廠商（不分頁）' })
  @ApiResponse({ status: 200, description: '成功返回廠商列表', type: [Vendor] })
  @Get('all')
  findAllWithoutPagination() {
    return this.vendorService.findAllWithoutPagination();
  }

  @ApiOperation({ summary: '根據 ID 獲取單個廠商' })
  @ApiParam({ name: 'id', description: '廠商 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回廠商資訊', type: Vendor })
  @ApiResponse({ status: 404, description: '廠商不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.findOne(id);
  }

  @ApiOperation({ summary: '建立新廠商' })
  @ApiResponse({ status: 201, description: '成功建立廠商', type: Vendor })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorService.create(createVendorDto);
  }

  @ApiOperation({ summary: '更新廠商資料' })
  @ApiParam({ name: 'id', description: '廠商 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新廠商資料', type: Vendor })
  @ApiResponse({ status: 404, description: '廠商不存在' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorService.update(id, updateVendorDto);
  }

  @ApiOperation({ summary: '刪除廠商' })
  @ApiParam({ name: 'id', description: '廠商 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除廠商' })
  @ApiResponse({ status: 404, description: '廠商不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vendorService.remove(id);
  }
}
