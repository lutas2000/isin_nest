/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';
import { HrAttendancePipelineService } from '../hr/working-hours/hr-attendance-pipeline.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  const pipelineService = { runAttendancePipeline: jest.fn() };
  const schedulerRegistry = {
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: HttpService, useValue: { request: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
        { provide: HrAttendancePipelineService, useValue: pipelineService },
      ],
    }).compile();

    service = module.get(SchedulerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('manualCalculateManHour invokes pipeline cron mode', async () => {
    pipelineService.runAttendancePipeline.mockResolvedValue(undefined);
    await service.manualCalculateManHour();
    expect(pipelineService.runAttendancePipeline).toHaveBeenCalledWith('cron');
  });

  it('handleCalculateManHour runs pipeline on cron tick', async () => {
    pipelineService.runAttendancePipeline.mockResolvedValue(undefined);
    await service.handleCalculateManHour();
    expect(pipelineService.runAttendancePipeline).toHaveBeenCalledWith('cron');
  });

  it('cron schedule is every 30 minutes', () => {
    const metadata = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      SchedulerService.prototype.handleCalculateManHour,
    );
    expect(metadata.cronTime).toBe('0 */30 * * * *');
    expect(metadata.timeZone).toBe('Asia/Taipei');
  });
});
