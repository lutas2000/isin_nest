/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffWorkhourController } from './staff-workhour.controller';
import { StaffWorkhourService } from './staff-workhour.service';

describe('StaffWorkhourController', () => {
  let controller: StaffWorkhourController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    findByDateRange: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffWorkhourController],
      providers: [{ provide: StaffWorkhourService, useValue: service }],
    }).compile();
    controller = module.get(StaffWorkhourController);
  });

  it('findByName delegates to service', async () => {
    service.findByName.mockResolvedValue([]);
    await controller.findByName('張三');
    expect(service.findByName).toHaveBeenCalledWith('張三');
  });
});
