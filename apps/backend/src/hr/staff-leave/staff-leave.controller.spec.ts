/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeaveService } from './staff-leave.service';

describe('StaffLeaveController', () => {
  let controller: StaffLeaveController;
  const service = {
    findAll: jest.fn(),
    findInRange: jest.fn(),
    balance: jest.fn(),
    defaults: jest.fn(),
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(StaffLeaveController);
  });

  it('create passes the logged-in user id so verify comes from the JWT, not the body', async () => {
    service.create.mockResolvedValue([{ id: 1 }]);
    const dto = { name: '張三', type: '特休', start_time: '2026-06-01 08:00', end_time: '2026-06-01 17:00' } as never;
    await controller.create(dto, { user: { id: 7 } });
    expect(service.create).toHaveBeenCalledWith(dto, 7);
  });

  it('exposes the 12 leave types without 防疫假', () => {
    const types = controller.types();
    expect(types).toHaveLength(12);
    expect(types).not.toContain('防疫假');
  });

  it('findByStaffName delegates to service', async () => {
    service.findByStaffName.mockResolvedValue([]);
    await controller.findByStaffName('張三');
    expect(service.findByStaffName).toHaveBeenCalledWith('張三');
  });
});
