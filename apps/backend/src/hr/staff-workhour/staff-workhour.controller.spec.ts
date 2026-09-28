/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { StaffWorkhourController } from './staff-workhour.controller';
import { StaffWorkhourService } from './staff-workhour.service';

describe('StaffWorkhourController', () => {
  let controller: StaffWorkhourController;
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    findByDateRange: jest.fn(),
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

  it('exposes staff_workhour as read-only', () => {
    const prototype = Object.getPrototypeOf(controller);
    const routeMethods = Object.getOwnPropertyNames(prototype)
      .filter((name) => name !== 'constructor')
      .map((name) => Reflect.getMetadata(METHOD_METADATA, prototype[name]));
    expect(routeMethods).not.toHaveLength(0);
    expect(routeMethods).toEqual(expect.arrayContaining([RequestMethod.GET]));
    expect(routeMethods.every((method) => method === RequestMethod.GET)).toBe(
      true,
    );
  });
});
