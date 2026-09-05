/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { AttendRecordController } from './attend-record.controller';
import { AttendRecordService } from './attend-record.service';

describe('AttendRecordController', () => {
  let controller: AttendRecordController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStaffId: jest.fn(),
    findByStaffIdAndDateRange: jest.fn(),
    findByAttendType: jest.fn(),
    findTodayByStaffId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    manualProcessFiles: jest.fn(),
    processCsvFiles: jest.fn(),
    processUsbFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendRecordController],
      providers: [{ provide: AttendRecordService, useValue: service }],
    }).compile();
    controller = module.get(AttendRecordController);
  });

  it('processCsvFiles returns success message', async () => {
    service.processCsvFiles.mockResolvedValue(undefined);
    const result = await controller.processCsvFiles();
    expect(result.message).toContain('CSV');
  });

  it('processUsbFiles returns success message', async () => {
    service.processUsbFile.mockResolvedValue(undefined);
    const result = await controller.processUsbFiles();
    expect(result.message).toContain('USB');
  });

  it('findOne uses string id', async () => {
    service.findOne.mockResolvedValue({ id: '123張三' });
    await controller.findOne('123張三');
    expect(service.findOne).toHaveBeenCalledWith('123張三');
  });
});
