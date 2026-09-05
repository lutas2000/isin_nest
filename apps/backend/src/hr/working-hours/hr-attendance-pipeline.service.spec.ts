/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { HrAttendancePipelineService } from './hr-attendance-pipeline.service';
import { AttendRecordCsvReader } from '../attend-record/attend-record-csv-reader';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';

describe('HrAttendancePipelineService', () => {
  let service: HrAttendancePipelineService;
  const csvReader = { searchAttendLogs: jest.fn() };
  const workingHours = { appointAttendRecordsType: jest.fn() };
  const manHourManager = { calculateManHour: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrAttendancePipelineService,
        { provide: AttendRecordCsvReader, useValue: csvReader },
        { provide: WorkingHours, useValue: workingHours },
        { provide: ManHourManager, useValue: manHourManager },
      ],
    }).compile();
    service = module.get(HrAttendancePipelineService);
  });

  it('runAttendancePipeline today calculates yesterday and today', async () => {
    workingHours.appointAttendRecordsType.mockResolvedValue(new Date());
    await service.runAttendancePipeline('today');
    expect(csvReader.searchAttendLogs).toHaveBeenCalled();
    expect(workingHours.appointAttendRecordsType).toHaveBeenCalled();
    expect(manHourManager.calculateManHour).toHaveBeenCalledTimes(2);
  });

  it('runAttendancePipeline cron exits when no lastTime', async () => {
    workingHours.appointAttendRecordsType.mockResolvedValue(null);
    await service.runAttendancePipeline('cron');
    expect(manHourManager.calculateManHour).not.toHaveBeenCalled();
  });
});
