import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('系統管理')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '取得歡迎訊息' })
  @ApiResponse({ status: 200, description: '成功取得歡迎訊息' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: '系統健康檢查' })
  @ApiResponse({ status: 200, description: '系統運行正常' })
  healthCheck(): { status: string; timestamp: string; message: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: '系統運行正常',
    };
  }

  @Post('api/sync')
  @ApiOperation({ summary: '資料同步端點（供定期任務呼叫）' })
  @ApiResponse({ status: 200, description: '資料同步成功' })
  dataSync(@Body() body?: any): {
    status: string;
    timestamp: string;
    data: any;
  } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = body || { message: '資料同步完成' };
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      data,
    };
  }
}
