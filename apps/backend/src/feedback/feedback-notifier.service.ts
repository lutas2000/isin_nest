import { Injectable, Logger } from '@nestjs/common';
import { SlackWebhookService } from '../slack/slack-webhook.service';
import { FeedbackReport } from './entities/feedback-report.entity';

/** 回報通知要推到的頻道；沒有設定就不通知（等於關閉）。 */
export const FEEDBACK_SLACK_SETTING = 'FEEDBACK_SLACK_WEBHOOK_URL';

const KIND_LABELS: Record<string, string> = {
  bug: '錯誤',
  feature: '需求',
  question: '問題',
};

/** Slack mrkdwn 的控制字元：避免使用者輸入的 `<!channel>`、連結語法被 Slack 解讀。 */
function escapeSlack(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 新回報寫入後推一則 Slack 訊息（LEGACY-CRM-REBUILD-PLAN.md 7.2）。只有編號、類型、標題、回報者與畫面，
 * 不附描述與截圖（可能含客戶資料）。送不出去只記 log，不影響回報本身。
 */
@Injectable()
export class FeedbackNotifierService {
  private readonly logger = new Logger(FeedbackNotifierService.name);

  constructor(private readonly slack: SlackWebhookService) {}

  get enabled(): boolean {
    return this.slack.isConfigured(FEEDBACK_SLACK_SETTING);
  }

  message(report: FeedbackReport, reporter: string): string {
    const context = report.context ?? {};
    const where = [context.window, context.route]
      .filter((value): value is string => typeof value === 'string' && !!value)
      .join(' / ');
    return [
      `新回報 #${report.id}（${KIND_LABELS[report.kind] ?? report.kind}）：${escapeSlack(report.title)}`,
      `回報者：${escapeSlack(reporter)}`,
      where ? `畫面：${escapeSlack(where)}` : null,
      report.screenshot_path ? '附有截圖（僅管理員可在回報處理頁查看）' : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async notifyCreated(report: FeedbackReport, reporter: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.slack.send(
        this.message(report, reporter),
        FEEDBACK_SLACK_SETTING,
      );
    } catch (error) {
      this.logger.error(
        `Feedback Slack notification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
