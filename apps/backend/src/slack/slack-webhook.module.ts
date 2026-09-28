import { Module } from '@nestjs/common';
import { SlackWebhookService } from './slack-webhook.service';

@Module({
  providers: [SlackWebhookService],
  exports: [SlackWebhookService],
})
export class SlackWebhookModule {}
