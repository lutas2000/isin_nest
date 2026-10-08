import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SlackWebhookModule } from '../slack/slack-webhook.module';
import { FeedbackReport } from './entities/feedback-report.entity';
import { FeedbackController } from './feedback.controller';
import { FeedbackNotifierService } from './feedback-notifier.service';
import { FeedbackScreenshotStore } from './feedback-screenshot.store';
import { FeedbackService } from './feedback.service';

/**
 * 回報系統（bug／需求／問題），新系統的共用模組；目前觸發按鈕在舊版銷管選單列「回報(B)」，
 * 管理畫面是新系統的 /settings/feedback。規劃見 docs/LEGACY-CRM-REBUILD-PLAN.md 第 7 節，API 見 docs/FEEDBACK-AND-LOGS.md。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FeedbackReport]),
    AuthModule,
    SlackWebhookModule,
  ],
  controllers: [FeedbackController],
  providers: [
    FeedbackService,
    FeedbackScreenshotStore,
    FeedbackNotifierService,
  ],
})
export class FeedbackModule {}
