import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { AdminGuard } from '../auth/admin.guard';
import { RequireFeature } from '../auth/decorators/feature-permission.decorator';
import { PermissionType } from '../auth/entities/user-feature.entity';
import { FeatureGuard } from '../auth/guards/feature.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateFeedbackDto,
  FeedbackQueryDto,
  UpdateFeedbackDto,
} from './dto/feedback.dto';
import { FEEDBACK_SCREENSHOT_MAX_BYTES } from './feedback-screenshot.store';
import {
  FeedbackActor,
  FeedbackScreenshotFile,
  FeedbackService,
} from './feedback.service';

/** 處理回報需要的功能；admin 不需授權。 */
export const FEEDBACK_FEATURE = 'feedback';

type AuthedRequest = { user: { id: number; isAdmin: boolean } };

const actorOf = (request: AuthedRequest): FeedbackActor => ({
  id: request.user.id,
  isAdmin: Boolean(request.user.isAdmin),
});

/**
 * 回報系統（LEGACY-CRM-REBUILD-PLAN.md 第 7、8 節）：
 * - 送出：任何登入者（不需要 `crm`），可附一張 PNG 截圖（上限 5 MB）。
 * - 列表、改狀態與處理者：admin 或 `feedback` write。
 * - 截圖：只有 admin。
 */
@ApiTags('回報系統')
@ApiBearerAuth('JWT-auth')
@Controller('feedback')
@UseGuards(JwtAuthGuard, FeatureGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @UseInterceptors(
    // 沒有指定 storage 時 multer 存在記憶體（file.buffer），由 service 驗證 PNG 後寫入 FEEDBACK_UPLOAD_DIR。
    FileInterceptor('screenshot', {
      limits: {
        // busboy 在檔案「達到」上限時就判定超過，所以 +1：剛好 5 MB 可以，多 1 byte 回 413。
        fileSize: FEEDBACK_SCREENSHOT_MAX_BYTES + 1,
        files: 1,
        fields: 10,
        fieldSize: 16 * 1024,
      },
    }),
  )
  @ApiOperation({
    summary: '送出回報（任何登入者）',
    description:
      'multipart/form-data：kind、title、body、context（JSON 字串），截圖放 `screenshot`（PNG，上限 5 MB）。寫入後若有設定 FEEDBACK_SLACK_WEBHOOK_URL 會推一則 Slack 訊息（不附截圖）。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kind', 'title', 'body'],
      properties: {
        kind: { type: 'string', enum: ['bug', 'feature', 'question'] },
        title: { type: 'string', maxLength: 100 },
        body: { type: 'string', maxLength: 5000 },
        context: { type: 'string', description: 'JSON 字串' },
        screenshot: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: '{ item }' })
  @ApiResponse({ status: 400, description: '欄位不合法、截圖不是 PNG' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 413, description: '截圖超過 5 MB' })
  create(
    @Request() request: AuthedRequest,
    @Body() dto: CreateFeedbackDto,
    @UploadedFile() screenshot?: FeedbackScreenshotFile,
  ) {
    return this.feedback.create(actorOf(request), dto, screenshot);
  }

  @Get()
  @RequireFeature(FEEDBACK_FEATURE, PermissionType.WRITE)
  @ApiOperation({
    summary: '回報列表（admin 或 feedback write）',
    description:
      '回 { items, total, page, page_size }，新的在前。`has_screenshot` 只在 admin 的回應中出現。',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: '篩選條件不合法' })
  @ApiResponse({ status: 401, description: '未登入' })
  @ApiResponse({ status: 403, description: '沒有 feedback write 權限' })
  list(@Request() request: AuthedRequest, @Query() query: FeedbackQueryDto) {
    return this.feedback.list(actorOf(request), query);
  }

  @Get('assignees')
  @RequireFeature(FEEDBACK_FEATURE, PermissionType.WRITE)
  @ApiOperation({
    summary: '可指派的處理者：admin 與有 feedback write 的使用者',
  })
  @ApiResponse({ status: 200, description: '[{ id, name }]' })
  @ApiResponse({ status: 403, description: '沒有 feedback write 權限' })
  assignees() {
    return this.feedback.assignees();
  }

  @Patch(':id')
  @RequireFeature(FEEDBACK_FEATURE, PermissionType.WRITE)
  @ApiOperation({
    summary: '更新狀態、處理者、處理結果（admin 或 feedback write）',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: '{ item }' })
  @ApiResponse({ status: 400, description: '欄位不合法或處理者沒有權限' })
  @ApiResponse({ status: 403, description: '沒有 feedback write 權限' })
  @ApiResponse({ status: 404, description: '找不到回報' })
  update(
    @Request() request: AuthedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedback.update(actorOf(request), id, dto);
  }

  @Get(':id/screenshot')
  @UseGuards(AdminGuard)
  @HttpCode(200)
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: '回報截圖（只有 admin，回報者本人也不行）' })
  @ApiParam({ name: 'id', type: Number })
  @ApiProduces('image/png')
  @ApiResponse({ status: 200, description: 'PNG' })
  @ApiResponse({ status: 403, description: '不是 admin' })
  @ApiResponse({ status: 404, description: '沒有截圖或檔案不存在' })
  async screenshot(@Param('id', ParseIntPipe) id: number) {
    const file = await this.feedback.screenshotPath(id);
    return new StreamableFile(createReadStream(file));
  }
}
