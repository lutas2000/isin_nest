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
  Patch,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProcessingService } from './processing.service';
import { Processing } from './entities/processing.entity';
import { CreateProcessingDto } from './dto/create-processing.dto';
import { UpdateProcessingDto } from './dto/update-processing.dto';

@ApiTags('加工項目管理')
@Controller('crm/processings')
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @ApiOperation({ summary: '獲取所有加工項目' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiQuery({ name: 'includeInactive', required: false, description: '是否包含停用項目', example: false })
  @ApiResponse({ status: 200, description: '成功返回加工項目列表', type: [Processing] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.processingService.findAll(page, limit, includeInactive);
  }

  @ApiOperation({ summary: '獲取所有啟用的加工項目（不分頁，用於下拉選單）' })
  @ApiResponse({ status: 200, description: '成功返回加工項目列表', type: [Processing] })
  @Get('active')
  findAllActive() {
    return this.processingService.findAllActive();
  }

  @ApiOperation({ summary: '根據多個 ID 獲取加工項目' })
  @ApiResponse({ status: 200, description: '成功返回加工項目列表', type: [Processing] })
  @Post('by-ids')
  findByIds(@Body('ids') ids: number[]) {
    return this.processingService.findByIds(ids);
  }

  @ApiOperation({ summary: '根據 ID 獲取單個加工項目' })
  @ApiParam({ name: 'id', description: '加工項目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回加工項目', type: Processing })
  @ApiResponse({ status: 404, description: '加工項目不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.findOne(id);
  }

  @ApiOperation({ summary: '建立新加工項目' })
  @ApiResponse({ status: 201, description: '成功建立加工項目', type: Processing })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() createProcessingDto: CreateProcessingDto) {
    return this.processingService.create(createProcessingDto);
  }

  @ApiOperation({ summary: '更新加工項目' })
  @ApiParam({ name: 'id', description: '加工項目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新加工項目', type: Processing })
  @ApiResponse({ status: 404, description: '加工項目不存在' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProcessingDto: UpdateProcessingDto,
  ) {
    return this.processingService.update(id, updateProcessingDto);
  }

  @ApiOperation({ summary: '停用加工項目' })
  @ApiParam({ name: 'id', description: '加工項目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功停用加工項目', type: Processing })
  @ApiResponse({ status: 404, description: '加工項目不存在' })
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.deactivate(id);
  }

  @ApiOperation({ summary: '啟用加工項目' })
  @ApiParam({ name: 'id', description: '加工項目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功啟用加工項目', type: Processing })
  @ApiResponse({ status: 404, description: '加工項目不存在' })
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.activate(id);
  }

  @ApiOperation({ summary: '刪除加工項目' })
  @ApiParam({ name: 'id', description: '加工項目 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除加工項目' })
  @ApiResponse({ status: 404, description: '加工項目不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.processingService.remove(id);
  }
}
