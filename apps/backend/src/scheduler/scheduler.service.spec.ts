import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { WorkingHoursService } from '../hr/working-hours/working-hours.service';
import {
  AttendRecordCsvReader,
  AttendRecordUsbReader,
} from '../hr/attend-record/attend-record-csv-reader';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService HR job', () => {
  it('runs the full attendance import, classification, and daily calculation flow', async () => {
    const httpService = {} as HttpService;
    const configService = {} as ConfigService;
    const schedulerRegistry = {} as SchedulerRegistry;
    const workingHoursService = {
      appointAttendanceTypes: jest.fn().mockResolvedValue(new Date('2024-06-01T10:00:00.000Z')),
      calculateCompleteWorkingHours: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkingHoursService;
    const attendRecordCsvReader = {
      searchAttendLogs: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordCsvReader;
    const attendRecordUsbReader = {
      read: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordUsbReader;
    const service = new SchedulerService(
      httpService,
      configService,
      schedulerRegistry,
      workingHoursService,
      attendRecordCsvReader,
      attendRecordUsbReader,
    );

    await service.runWorkingHoursJob(new Date('2024-06-02T10:00:00.000Z'));

    expect(attendRecordCsvReader.searchAttendLogs).toHaveBeenCalledTimes(1);
    expect(attendRecordUsbReader.read).toHaveBeenCalledTimes(1);
    expect(workingHoursService.appointAttendanceTypes).toHaveBeenCalledTimes(1);
    expect(workingHoursService.calculateCompleteWorkingHours).toHaveBeenCalled();
  });

  it('still recalculates yesterday and today when no new attendance is imported', async () => {
    const workingHoursService = {
      appointAttendanceTypes: jest.fn().mockResolvedValue(null),
      calculateCompleteWorkingHours: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkingHoursService;
    const attendRecordCsvReader = {
      searchAttendLogs: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordCsvReader;
    const attendRecordUsbReader = {
      read: jest.fn().mockResolvedValue(undefined),
    } as unknown as AttendRecordUsbReader;
    const service = new SchedulerService(
      {} as HttpService,
      {} as ConfigService,
      {} as SchedulerRegistry,
      workingHoursService,
      attendRecordCsvReader,
      attendRecordUsbReader,
    );

    await service.runWorkingHoursJob(new Date('2024-06-02T10:00:00.000Z'));

    expect(workingHoursService.calculateCompleteWorkingHours).toHaveBeenCalledTimes(2);
  });
});
