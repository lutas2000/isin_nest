/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeaveService } from './staff-leave.service';

describe('StaffLeaveController', () => {
  let controller: StaffLeaveController;
  const service = {
    findAll: jest.fn(),
    findByDateRange: jest.fn(),
    findByStaffId: jest.fn(),
    findByStaffName: jest.fn(),
    findByType: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffLeaveController],
      providers: [{ provide: StaffLeaveService, useValue: service }],
    }).compile();
    controller = module.get(StaffLeaveController);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue({ id: 1 });
    await controller.create({ name: '張三' } as any);
    expect(service.create).toHaveBeenCalled();
  });

  it('findByStaffName delegates to service', async () => {
    service.findByStaffName.mockResolvedValue([]);
    await controller.findByStaffName('張三');
    expect(service.findByStaffName).toHaveBeenCalledWith('張三');
  });
});
