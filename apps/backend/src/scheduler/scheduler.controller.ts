import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SchedulerService, ScheduledTask } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

export class CreateTaskDto {
  id: string;
  name: string;
  cronExpression: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  enabled: boolean;
  description?: string;
}

export class UpdateTaskDto {
  name?: string;
  cronExpression?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  enabled?: boolean;
  description?: string;
}

@ApiTags('定期任務管理')
@Controller('api/scheduler')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Get('tasks')
  @ApiOperation({ summary: '取得所有定期任務' })
  @ApiResponse({ status: 200, description: '成功取得任務列表' })
  getAllTasks(): ScheduledTask[] {
    return this.schedulerService.getAllTasks();
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '取得特定定期任務' })
  @ApiResponse({ status: 200, description: '成功取得任務詳情' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  getTask(@Param('id') id: string): ScheduledTask | { message: string } {
    const task = this.schedulerService.getTask(id);
    if (!task) {
      return { message: `找不到任務: ${id}` };
    }
    return task;
  }

  @Post('tasks')
  @ApiOperation({ summary: '建立新的定期任務' })
  @ApiResponse({ status: 201, description: '任務建立成功' })
  @ApiResponse({ status: 400, description: '請求參數錯誤' })
  @HttpCode(HttpStatus.CREATED)
  createTask(@Body() createTaskDto: CreateTaskDto): { message: string } {
    this.schedulerService.addTask(createTaskDto);
    return { message: `任務 ${createTaskDto.name} 建立成功` };
  }

  @Put('tasks/:id')
  @ApiOperation({ summary: '更新定期任務' })
  @ApiResponse({ status: 200, description: '任務更新成功' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): { message: string } {
    const success = this.schedulerService.updateTask(id, updateTaskDto);
    if (!success) {
      return { message: `找不到任務: ${id}` };
    }
    return { message: `任務 ${id} 更新成功` };
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: '刪除定期任務' })
  @ApiResponse({ status: 200, description: '任務刪除成功' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  removeTask(@Param('id') id: string): { message: string } {
    const success = this.schedulerService.removeTask(id);
    if (!success) {
      return { message: `找不到任務: ${id}` };
    }
    return { message: `任務 ${id} 刪除成功` };
  }

  @Post('tasks/:id/enable')
  @ApiOperation({ summary: '啟用定期任務' })
  @ApiResponse({ status: 200, description: '任務啟用成功' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  @HttpCode(HttpStatus.OK)
  enableTask(@Param('id') id: string): { message: string } {
    const success = this.schedulerService.enableTask(id);
    if (!success) {
      return { message: `找不到任務: ${id}` };
    }
    return { message: `任務 ${id} 啟用成功` };
  }

  @Post('tasks/:id/disable')
  @ApiOperation({ summary: '停用定期任務' })
  @ApiResponse({ status: 200, description: '任務停用成功' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  @HttpCode(HttpStatus.OK)
  disableTask(@Param('id') id: string): { message: string } {
    const success = this.schedulerService.disableTask(id);
    if (!success) {
      return { message: `找不到任務: ${id}` };
    }
    return { message: `任務 ${id} 停用成功` };
  }

  @Post('tasks/:id/run')
  @ApiOperation({ summary: '手動執行定期任務' })
  @ApiResponse({ status: 200, description: '任務執行成功' })
  @ApiResponse({ status: 404, description: '找不到指定任務' })
  @ApiResponse({ status: 500, description: '任務執行失敗' })
  @HttpCode(HttpStatus.OK)
  async runTask(@Param('id') id: string): Promise<{ message: string }> {
    const success = await this.schedulerService.runTask(id);
    if (!success) {
      return { message: `任務執行失敗: ${id}` };
    }
    return { message: `任務 ${id} 執行成功` };
  }

  @Get('health')
  @ApiOperation({ summary: '系統健康檢查' })
  @ApiResponse({ status: 200, description: '系統運行正常' })
  healthCheck(): { status: string; timestamp: string; tasks: number } {
    const tasks = this.schedulerService.getAllTasks();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      tasks: tasks.length,
    };
  }

  @Get('cron-examples')
  @ApiOperation({ summary: '取得 Cron 表達式範例' })
  @ApiResponse({ status: 200, description: '成功取得範例' })
  getCronExamples(): Record<string, string> {
    return {
      每分鐘: '0 * * * * *',
      每5分鐘: '0 */5 * * * *',
      每小時: '0 0 * * * *',
      每天午夜: '0 0 0 * * *',
      每天早上8點: '0 0 8 * * *',
      每周一早上9點: '0 0 9 * * 1',
      每月1號午夜: '0 0 0 1 * *',
      工作日每天早上9點: '0 0 9 * * 1-5',
      周末早上10點: '0 0 10 * * 6,0',
    };
  }

  // @Post('calculate-man-hour')
  // @ApiOperation({ summary: '手動觸發工時計算任務' })
  // @ApiResponse({ status: 200, description: '工時計算任務開始執行' })
  // @ApiResponse({ status: 500, description: '工時計算任務執行失敗' })
  // async manualCalculateManHour(): Promise<{ message: string }> {
  //   await this.schedulerService.manualCalculateManHour();
  //   return { message: '工時計算任務已開始執行' };
  // }
}
