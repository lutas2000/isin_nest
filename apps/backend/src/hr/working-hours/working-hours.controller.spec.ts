/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { WorkingHoursController } from './working-hours.controller';
import { WorkingHoursService } from './working-hours.service';

describe('WorkingHoursController', () => {
  let controller: WorkingHoursController;
  const service = {
    calculateCompleteWorkingHours: jest.fn(),
    recalculateWorkingHoursRange: jest.fn(),
    calculateStaffBreakTime: jest.fn(),
    getStaffSegmentInfo: jest.fn(),
    processStaffAttendanceRecords: jest.fn(),
    getWorkingHoursSummary: jest.fn(),
    checkIncompleteWorkHours: jest.fn(),
    getSystemStatus: jest.fn(),
    appointAttendRecordsType: jest.fn(),
    runDailyPipeline: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingHoursController],
      providers: [{ provide: WorkingHoursService, useValue: service }],
    }).compile();
    controller = module.get(WorkingHoursController);
  });

  it('appointAttendType delegates to service', async () => {
    service.appointAttendRecordsType.mockResolvedValue(new Date());
    const result = await controller.appointAttendType();
    expect(result.message).toContain('succeed');
  });

  it('runDailyPipeline delegates to service', async () => {
    service.runDailyPipeline.mockResolvedValue(undefined);
    const result = await controller.runDailyPipeline();
    expect(result.message).toBe('succeed');
  });

  it('calculateWorkingHours delegates to service', async () => {
    service.calculateCompleteWorkingHours.mockResolvedValue(undefined);
    const result = await controller.calculateWorkingHours({ date: '2024-01-01' });
    expect(result.message).toContain('2024-01-01');
  });
});
