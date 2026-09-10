import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CronJob } from 'cron';
import { WorkingHoursService } from '../hr/working-hours/working-hours.service';
import {
  AttendRecordCsvReader,
  AttendRecordUsbReader,
} from '../hr/attend-record/attend-record-csv-reader';

export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  description?: string;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly workingHoursService: WorkingHoursService,
    private readonly attendRecordCsvReader: AttendRecordCsvReader,
    private readonly attendRecordUsbReader: AttendRecordUsbReader,
  ) {
    this.initializeDefaultTasks();
  }

  /**
   * 初始化預設任務
   */
  private initializeDefaultTasks(): void {
    // 範例：每小時執行資料同步
    // this.addTask({
    //   id: 'data-sync',
    //   name: '資料同步任務',
    //   cronExpression: CronExpression.EVERY_HOUR,
    //   url: `http://localhost:${this.configService.get('PORT', 3000)}/api/sync`,
    //   method: 'POST',
    //   enabled: false, // 預設停用，需要手動啟用
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: {
    //     source: 'scheduler',
    //     timestamp: new Date().toISOString(),
    //   },
    //   description: '每小時執行資料同步任務',
    // });
  }

  /**
   * 新增定期任務
   */
  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);

    if (task.enabled) {
      this.createCronJob(task);
    }

    this.logger.log(`任務已新增: ${task.name} (${task.id})`);
  }

  /**
   * 建立 Cron 工作
   */
  private createCronJob(task: ScheduledTask): void {
    const job = new CronJob(task.cronExpression, async () => {
      await this.executeTask(task);
    });

    this.schedulerRegistry.addCronJob(task.id, job);
    job.start();

    // 計算下次執行時間
    task.nextRun = job.nextDate().toJSDate();

    this.logger.log(
      `Cron 工作已建立: ${task.name} - 下次執行: ${task.nextRun?.toISOString() || 'N/A'}`,
    );
  }

  /**
   * 執行任務
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      this.logger.log(`開始執行任務: ${task.name}`);

      const config = {
        method: task.method,
        url: task.url,
        headers: task.headers || {},
        ...(task.body && typeof task.body === 'object'
          ? { data: task.body }
          : {}),
      };

      const response = await firstValueFrom(this.httpService.request(config));

      // 更新最後執行時間
      task.lastRun = new Date();

      // 計算下次執行時間
      const job = this.schedulerRegistry.getCronJob(task.id);
      if (job) {
        task.nextRun = job.nextDate().toJSDate();
      }

      this.logger.log(
        `任務執行成功: ${task.name} - 狀態碼: ${response.status.toString()}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `任務執行失敗: ${task.name} - 錯誤: ${errorMessage}`,
        errorStack,
      );
    }
  }

  /**
   * 啟用任務
   */
  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    if (!task.enabled) {
      task.enabled = true;
      this.createCronJob(task);
      this.logger.log(`任務已啟用: ${task.name}`);
    }

    return true;
  }

  /**
   * 停用任務
   */
  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    if (task.enabled) {
      task.enabled = false;

      try {
        const job = this.schedulerRegistry.getCronJob(taskId);
        job.stop();
        this.schedulerRegistry.deleteCronJob(taskId);
        this.logger.log(`任務已停用: ${task.name}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.warn(`停用任務時發生錯誤: ${taskId}`, errorMessage);
      }
    }

    return true;
  }

  /**
   * 刪除任務
   */
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    // 先停用任務
    this.disableTask(taskId);

    // 從任務列表中移除
    this.tasks.delete(taskId);
    this.logger.log(`任務已刪除: ${task.name}`);

    return true;
  }

  /**
   * 手動執行任務
   */
  async runTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    try {
      await this.executeTask(task);
      return true;
    } catch (error: unknown) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`手動執行任務失敗: ${taskId}`, errorStack);
      return false;
    }
  }

  /**
   * 取得所有任務
   */
  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 取得特定任務
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 更新任務
   */
  updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    // 如果任務正在運行，先停用
    const wasEnabled = task.enabled;
    if (wasEnabled) {
      this.disableTask(taskId);
    }

    // 更新任務屬性
    Object.assign(task, updates);

    // 如果任務原本是啟用的，重新啟用
    if (wasEnabled && task.enabled) {
      this.enableTask(taskId);
    }

    this.logger.log(`任務已更新: ${task.name}`);
    return true;
  }

  /**
   * HR 工時計算任務：每 30 分鐘匯入、分類，並補算完整日期範圍。
   */
  @Cron('0 */30 * * * *', {
    name: 'calculate-man-hour',
    timeZone: 'Asia/Taipei',
  })
  async handleCalculateManHour(): Promise<void> {
    try {
      await this.runWorkingHoursJob();
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error('工時計算任務執行失敗', errorStack);
    }
  }

  /**
   * 可由排程與管理介面共用的完整流程；now 參數讓測試能固定工作日邊界。
   */
  async runWorkingHoursJob(now = new Date()): Promise<void> {
    await this.attendRecordCsvReader.searchAttendLogs();
    await this.attendRecordUsbReader.read();
    const firstRecordTime =
      await this.workingHoursService.appointAttendanceTypes();

    const endTime = new Date(now);
    endTime.setUTCHours(6, 0, 0, 0);
    const startTime = firstRecordTime
      ? new Date(firstRecordTime)
      : new Date(endTime);

    if (firstRecordTime) {
      startTime.setUTCHours(6, 0, 0, 0);
      // 若目前尚未到今天 06:00，只補算到昨天 06:00。
      if (startTime > endTime) {
        endTime.setUTCDate(endTime.getUTCDate() - 1);
      }
    } else {
      // 沒有新打卡時仍重算昨日與今日，讓新核准的請假能反映到日工時表。
      startTime.setUTCDate(startTime.getUTCDate() - 1);
    }

    while (startTime <= endTime) {
      await this.workingHoursService.calculateCompleteWorkingHours(
        new Date(startTime),
        false,
      );
      startTime.setUTCDate(startTime.getUTCDate() + 1);
    }
  }

  /** 手動觸發與排程相同的 HR 流程。 */
  async manualCalculateManHour(): Promise<void> {
    await this.runWorkingHoursJob();
  }
}
