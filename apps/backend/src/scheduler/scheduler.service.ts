import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CronJob } from 'cron';
import { HrAttendancePipelineService } from '../hr/working-hours/hr-attendance-pipeline.service';

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
    private readonly pipelineService: HrAttendancePipelineService,
  ) {
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks(): void {
    // 預設任務列表可透過 REST API 擴充
  }

  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);

    if (task.enabled) {
      this.createCronJob(task);
    }

    this.logger.log(`任務已新增: ${task.name} (${task.id})`);
  }

  private createCronJob(task: ScheduledTask): void {
    const job = new CronJob(task.cronExpression, async () => {
      await this.executeTask(task);
    });

    this.schedulerRegistry.addCronJob(task.id, job);
    job.start();

    task.nextRun = job.nextDate().toJSDate();

    this.logger.log(
      `Cron 工作已建立: ${task.name} - 下次執行: ${task.nextRun?.toISOString() || 'N/A'}`,
    );
  }

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

      task.lastRun = new Date();

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

  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    this.disableTask(taskId);
    this.tasks.delete(taskId);
    this.logger.log(`任務已刪除: ${task.name}`);

    return true;
  }

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

  getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      this.logger.warn(`找不到任務: ${taskId}`);
      return false;
    }

    const wasEnabled = task.enabled;
    if (wasEnabled) {
      this.disableTask(taskId);
    }

    Object.assign(task, updates);

    if (wasEnabled && task.enabled) {
      this.enableTask(taskId);
    }

    this.logger.log(`任務已更新: ${task.name}`);
    return true;
  }

  @Cron('0 */30 * * * *', {
    name: 'calculate-man-hour',
    timeZone: 'Asia/Taipei',
  })
  async handleCalculateManHour(): Promise<void> {
    try {
      this.logger.log('開始執行工時計算任務...');
      await this.pipelineService.runAttendancePipeline('cron');
      this.logger.log('工時計算任務完成');
    } catch (error) {
      this.logger.error('工時計算任務執行失敗', error);
    }
  }

  async manualCalculateManHour(): Promise<void> {
    this.logger.log('手動觸發工時計算任務');
    await this.handleCalculateManHour();
  }
}
