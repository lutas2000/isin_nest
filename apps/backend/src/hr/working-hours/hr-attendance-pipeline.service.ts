import { Injectable, Logger } from '@nestjs/common';
import { AttendRecordCsvReader } from '../attend-record/attend-record-csv-reader';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';

@Injectable()
export class HrAttendancePipelineService {
  private readonly logger = new Logger(HrAttendancePipelineService.name);

  constructor(
    private readonly attendRecordCsvReader: AttendRecordCsvReader,
    private readonly workingHours: WorkingHours,
    private readonly manHourManager: ManHourManager,
  ) {}

  async runAttendancePipeline(mode: 'cron' | 'today'): Promise<void> {
    this.logger.log(`開始執行出勤管線 (${mode})`);

    await this.attendRecordCsvReader.searchAttendLogs();
    this.logger.log('出勤記錄匯入完成');

    const lastTime = await this.workingHours.appointAttendRecordsType();
    this.logger.log('打卡類型分類完成');

    const now = new Date();
    const endTime = new Date(now);
    endTime.setUTCHours(6, 0, 0, 0);

    if (mode === 'today') {
      const yesterday = new Date(endTime);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      await this.manHourManager.calculateManHour(yesterday);
      await this.manHourManager.calculateManHour(endTime);
      this.logger.log('今日管線工時計算完成');
      return;
    }

    if (!lastTime) {
      this.logger.log('沒有需要處理的打卡記錄，管線結束');
      return;
    }

    const startTime = new Date(endTime);
    startTime.setUTCFullYear(
      lastTime.getUTCFullYear(),
      lastTime.getUTCMonth(),
      lastTime.getUTCDate(),
    );
    startTime.setUTCHours(6, 0, 0, 0);

    let current = new Date(startTime);
    while (current <= endTime) {
      await this.manHourManager.calculateManHour(new Date(current));
      this.logger.log(`工時計算完成: ${current.toISOString().split('T')[0]}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    this.logger.log('Cron 管線工時計算完成');
  }
}
