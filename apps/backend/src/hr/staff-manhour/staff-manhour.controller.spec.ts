/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffManhourController } from './staff-manhour.controller';
import { StaffManhourService } from './staff-manhour.service';

describe('StaffManhourController', () => {
  let controller: StaffManhourController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    findByDateRange: jest.fn(),
    findByNameAndDate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffManhourController],
      providers: [{ provide: StaffManhourService, useValue: service }],
    }).compile();
    controller = module.get(StaffManhourController);
  });

  it('findByName delegates to service', async () => {
    service.findByName.mockResolvedValue([]);
    await controller.findByName('張三');
    expect(service.findByName).toHaveBeenCalledWith('張三');
  });
});
