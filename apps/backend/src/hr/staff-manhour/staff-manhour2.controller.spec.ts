/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { StaffManhour2Controller } from './staff-manhour2.controller';
import { StaffManhour2Service } from './staff-manhour2.service';

describe('StaffManhour2Controller', () => {
  let controller: StaffManhour2Controller;
  const service = {
    findAll: jest.fn(),
    search: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    copyFromManhour: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffManhour2Controller],
      providers: [{ provide: StaffManhour2Service, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FeatureGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(StaffManhour2Controller);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue({ id: 1, name: '張三' });
    await controller.create({ name: '張三', start_time: '2026-06-01 08:00' });
    expect(service.create).toHaveBeenCalled();
  });

  it('find searches when filters are given and paginates otherwise', async () => {
    service.search.mockResolvedValue([]);
    service.findAll.mockResolvedValue({ data: [] });
    await controller.find({ name: '張三', from: '2026-06-01', to: '2026-06-30' });
    expect(service.search).toHaveBeenCalledWith({ name: '張三', from: '2026-06-01', to: '2026-06-30' });
    await controller.find({}, 2, 20);
    expect(service.findAll).toHaveBeenCalledWith(2, 20);
  });
});
