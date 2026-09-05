/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

describe('StaffController', () => {
  let controller: StaffController;
  const staffService = {
    findAll: jest.fn(),
    findAllWithoutPagination: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    deleteUserForStaff: jest.fn(),
    verifyLockPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffController],
      providers: [{ provide: StaffService, useValue: staffService }],
    }).compile();
    controller = module.get(StaffController);
  });

  it('findAll delegates to service', async () => {
    staffService.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(staffService.findAll).toHaveBeenCalled();
  });

  it('findOne delegates to service', async () => {
    staffService.findOne.mockResolvedValue({ id: 'A1' });
    await controller.findOne('A1');
    expect(staffService.findOne).toHaveBeenCalledWith('A1');
  });

  it('create delegates to service', async () => {
    staffService.create.mockResolvedValue({ id: 'A1' });
    await controller.create({ id: 'A1', name: '張三' } as any);
    expect(staffService.create).toHaveBeenCalled();
  });
});
