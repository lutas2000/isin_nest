import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';
import { SchedulePicker } from '../working-hours/schedule-picker';
import { StaffLeave, LeaveStatus } from './entities/staff-leave.entity';
import { StaffLeaveService } from './staff-leave.service';

describe('StaffLeaveService', () => {
  const leaveRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<StaffLeave>;
  const staffRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Staff>;
  const schedulePicker = {
    initialize: jest.fn(),
    hasValidSegment: jest.fn(),
    getBreakHour: jest.fn(),
  } as unknown as SchedulePicker;

  beforeEach(() => {
    jest.clearAllMocks();
    staffRepository.findOne = jest
      .fn()
      .mockResolvedValue({ id: 'A001', name: '張三' }) as unknown as Repository<Staff>['findOne'];
    schedulePicker.initialize = jest
      .fn()
      .mockResolvedValue(undefined) as unknown as SchedulePicker['initialize'];
    schedulePicker.hasValidSegment = jest
      .fn()
      .mockReturnValue(true) as unknown as SchedulePicker['hasValidSegment'];
    schedulePicker.getBreakHour = jest
      .fn()
      .mockReturnValue(1) as unknown as SchedulePicker['getBreakHour'];
  });

  it('calculates break-adjusted leave hours and starts in PENDING status', async () => {
    const leave = {
      id: 1,
      staff_id: 'A001',
      type: '特休',
      start_time: new Date('2024-06-01T09:00:00.000Z'),
      end_time: new Date('2024-06-01T18:00:00.000Z'),
    } as StaffLeave;
    leaveRepository.create = jest
      .fn()
      .mockImplementation((value) => ({ ...value, id: 1 })) as unknown as Repository<StaffLeave>['create'];
    leaveRepository.save = jest
      .fn()
      .mockImplementation(async (value) => value) as unknown as Repository<StaffLeave>['save'];
    const service = new StaffLeaveService(
      leaveRepository,
      staffRepository,
      schedulePicker,
    );

    const result = await service.create(leave, 'A002');

    expect(schedulePicker.initialize).toHaveBeenCalledWith(
      'A001',
      leave.start_time,
    );
    expect(leaveRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        time: 8,
        status: LeaveStatus.PENDING,
        verify_by_staff_id: null,
      }),
    );
    expect(result.time).toBe(8);
    expect(result.status).toBe(LeaveStatus.PENDING);
  });

  it('requires a positive leave interval', async () => {
    const service = new StaffLeaveService(
      leaveRepository,
      staffRepository,
      schedulePicker,
    );

    await expect(
      service.create({
        staff_id: 'A001',
        type: '事假',
        start_time: new Date('2024-06-01T18:00:00.000Z'),
        end_time: new Date('2024-06-01T09:00:00.000Z'),
      } as StaffLeave),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approves a pending leave and records the verifier', async () => {
    const pending = {
      id: 1,
      status: LeaveStatus.PENDING,
      staff_id: 'A001',
    } as StaffLeave;
    leaveRepository.findOne = jest
      .fn()
      .mockResolvedValue(pending) as unknown as Repository<StaffLeave>['findOne'];
    leaveRepository.save = jest
      .fn()
      .mockImplementation(async (value) => value) as unknown as Repository<StaffLeave>['save'];
    const service = new StaffLeaveService(
      leaveRepository,
      staffRepository,
      schedulePicker,
    );

    const result = await service.approve(1, 'A002');

    expect(result.status).toBe(LeaveStatus.APPROVED);
    expect(result.verify_by_staff_id).toBe('A002');
  });

  it('treats a date-only leave range end as inclusive', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    leaveRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(queryBuilder) as unknown as Repository<StaffLeave>['createQueryBuilder'];
    const service = new StaffLeaveService(
      leaveRepository,
      staffRepository,
      schedulePicker,
    );

    await service.findByDateRange(
      new Date('2024-06-01'),
      new Date('2024-06-01'),
    );

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'staffLeave.start_time <= :endDate',
      { endDate: new Date('2024-06-01T23:59:59.999Z') },
    );
  });
});
