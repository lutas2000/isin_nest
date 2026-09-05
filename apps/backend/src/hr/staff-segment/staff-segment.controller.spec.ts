/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffSegmentController } from './staff-segment.controller';
import { StaffSegmentService } from './staff-segment.service';

describe('StaffSegmentController', () => {
  let controller: StaffSegmentController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByName: jest.fn(),
    findByStaffId: jest.fn(),
    findByDateRange: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffSegmentController],
      providers: [{ provide: StaffSegmentService, useValue: service }],
    }).compile();
    controller = module.get(StaffSegmentController);
  });

  it('findByName delegates to service', async () => {
    service.findByName.mockResolvedValue([]);
    await controller.findByName('張三');
    expect(service.findByName).toHaveBeenCalledWith('張三');
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue({ id: 1, name: '張三' });
    await controller.create({ name: '張三' } as any);
    expect(service.create).toHaveBeenCalled();
  });
});
