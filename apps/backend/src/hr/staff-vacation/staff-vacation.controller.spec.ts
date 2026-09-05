/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffVacationController } from './staff-vacation.controller';
import { StaffVacationService } from './staff-vacation.service';

describe('StaffVacationController', () => {
  let controller: StaffVacationController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByDateRange: jest.fn(),
    findByPay: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffVacationController],
      providers: [{ provide: StaffVacationService, useValue: service }],
    }).compile();
    controller = module.get(StaffVacationController);
  });

  it('findByPay parses integer pay flag', async () => {
    service.findByPay.mockResolvedValue([]);
    await controller.findByPay('1');
    expect(service.findByPay).toHaveBeenCalledWith(1);
  });

  it('create delegates to service', async () => {
    service.create.mockResolvedValue({ date: '2024-01-01', pay: 1 });
    await controller.create({ date: '2024-01-01', pay: 1 });
    expect(service.create).toHaveBeenCalled();
  });
});
