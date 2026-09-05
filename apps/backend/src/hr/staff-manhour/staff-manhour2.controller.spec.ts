/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffManhour2Controller } from './staff-manhour2.controller';
import { StaffManhour2Service } from './staff-manhour2.service';

describe('StaffManhour2Controller', () => {
  let controller: StaffManhour2Controller;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffManhour2Controller],
      providers: [{ provide: StaffManhour2Service, useValue: service }],
    }).compile();
    controller = module.get(StaffManhour2Controller);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue({ id: 1, name: '張三' });
    await controller.create({ name: '張三' });
    expect(service.create).toHaveBeenCalled();
  });
});
