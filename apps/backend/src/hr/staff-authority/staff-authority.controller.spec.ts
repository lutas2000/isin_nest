/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { StaffAuthorityController } from './staff-authority.controller';
import { StaffAuthorityService } from './staff-authority.service';

describe('StaffAuthorityController', () => {
  let controller: StaffAuthorityController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffAuthorityController],
      providers: [{ provide: StaffAuthorityService, useValue: service }],
    }).compile();
    controller = module.get(StaffAuthorityController);
  });

  it('findOne delegates to service', async () => {
    service.findOne.mockResolvedValue({ id: 'A1' });
    await controller.findOne('A1');
    expect(service.findOne).toHaveBeenCalledWith('A1');
  });
});
