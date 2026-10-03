/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  const schedulerRegistry = {
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
    deleteCronJob: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: HttpService, useValue: { request: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
      ],
    }).compile();
    service = module.get(SchedulerService);
  });

  it('no longer registers a built-in HR attendance cron', () => {
    expect((service as any).handleCalculateManHour).toBeUndefined();
    expect((service as any).manualCalculateManHour).toBeUndefined();
  });
});
