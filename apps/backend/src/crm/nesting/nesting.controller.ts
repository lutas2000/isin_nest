import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NestingService } from './nesting.service';
import { Nesting } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';

@ApiTags('排版管理')
@Controller('crm/nestings')
export class NestingController {
  constructor(private readonly nestingService: NestingService) {}

  @ApiOperation({ summary: '獲取所有排版' })
  @ApiQuery({ name: 'page', required: false, description: '頁碼 (預設: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每頁筆數 (預設: 50, 最大: 100)', example: 50 })
  @ApiResponse({ status: 200, description: '成功返回排版列表', type: [Nesting] })
  @Get()
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.nestingService.findAll(page, limit);
  }

  @ApiOperation({ summary: '根據訂貨單ID獲取排版' })
  @ApiParam({ name: 'orderId', description: '訂貨單ID', example: 'ORD001' })
  @ApiResponse({ status: 200, description: '成功返回排版列表', type: [Nesting] })
  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.nestingService.findByOrderId(orderId);
  }

  @ApiOperation({ summary: '根據ID獲取單個排版' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回排版', type: Nesting })
  @ApiResponse({ status: 404, description: '排版不存在' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.nestingService.findOne(id);
  }

  @ApiOperation({ summary: '建立新排版' })
  @ApiResponse({ status: 201, description: '成功建立排版', type: Nesting })
  @ApiResponse({ status: 400, description: '輸入資料錯誤' })
  @Post()
  create(@Body() data: Partial<Nesting>) {
    return this.nestingService.create(data);
  }

  @ApiOperation({ summary: '更新排版' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新排版', type: Nesting })
  @ApiResponse({ status: 404, description: '排版不存在' })
  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Nesting>,
  ) {
    return this.nestingService.update(id, data);
  }

  @ApiOperation({ summary: '定案排版' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功定案排版', type: Nesting })
  @ApiResponse({ status: 404, description: '排版不存在' })
  @Patch(':id/finalize')
  finalize(@Param('id', ParseIntPipe) id: number) {
    return this.nestingService.finalize(id);
  }

  @ApiOperation({ summary: '刪除排版' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功刪除排版' })
  @ApiResponse({ status: 404, description: '排版不存在' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.nestingService.remove(id);
  }

  // 排版工件管理
  @ApiOperation({ summary: '新增排版工件' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiResponse({ status: 201, description: '成功新增排版工件', type: NestingItem })
  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { orderItemId: number; quantity?: number },
  ) {
    return this.nestingService.addItem(id, body.orderItemId, body.quantity);
  }

  @ApiOperation({ summary: '更新排版工件數量' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiParam({ name: 'itemId', description: '排版工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功更新排版工件', type: NestingItem })
  @Patch(':id/items/:itemId')
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('quantity') quantity: number,
  ) {
    return this.nestingService.updateItem(itemId, quantity);
  }

  @ApiOperation({ summary: '移除排版工件' })
  @ApiParam({ name: 'id', description: '排版ID', example: 1 })
  @ApiParam({ name: 'itemId', description: '排版工件ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功移除排版工件' })
  @Delete(':id/items/:itemId')
  removeItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.nestingService.removeItem(itemId);
  }
}
