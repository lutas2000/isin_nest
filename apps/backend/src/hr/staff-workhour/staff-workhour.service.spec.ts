import { Repository } from 'typeorm';
import { StaffLeave, LeaveStatus } from '../staff-leave/entities/staff-leave.entity';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';
import { Staff } from '../staff/entities/staff.entity';
import { StaffWorkhour } from './entities/staff-workhour.entity';
import { StaffWorkhourService } from './staff-workhour.service';

describe('StaffWorkhourService', () => {
  const workhourRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
  } as unknown as Repository<StaffWorkhour>;
  const staffRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Staff>;
  const manhourRepository = {
    find: jest.fn(),
  } as unknown as Repository<StaffManhour>;
  const leaveRepository = {
    find: jest.fn(),
  } as unknown as Repository<StaffLeave>;
  const segmentRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<StaffSegment>;

  beforeEach(() => {
    jest.clearAllMocks();
    staffRepository.find = jest.fn().mockResolvedValue([
      {
        id: 'A001',
        name: '張三',
        need_check: true,
        begain_work: new Date('2024-01-01T00:00:00.000Z'),
      },
    ]) as unknown as Repository<Staff>['find'];
    manhourRepository.find = jest.fn().mockResolvedValue([
      {
        staffId: 'A001',
        start_time: new Date('2024-06-01T09:15:00.000Z'),
        end_time: new Date('2024-06-01T18:15:00.000Z'),
        work_time: 9,
      },
    ]) as unknown as Repository<StaffManhour>['find'];
    leaveRepository.find = jest.fn().mockResolvedValue([
      {
        staff_id: 'A001',
        status: LeaveStatus.APPROVED,
        start_time: new Date('2024-06-01T12:00:00.000Z'),
        end_time: new Date('2024-06-01T13:00:00.000Z'),
        time: 1,
      },
    ]) as unknown as Repository<StaffLeave>['find'];
    segmentRepository.findOne = jest.fn().mockResolvedValue({
      staffId: 'A001',
      begain_time: '09:00:00',
      end_time: '18:00:00',
      rest_time: 60,
      create_date: new Date('2024-01-01T00:00:00.000Z'),
    }) as unknown as Repository<StaffSegment>['findOne'];
    workhourRepository.findOne = jest
      .fn()
      .mockResolvedValue(null) as unknown as Repository<StaffWorkhour>['findOne'];
    workhourRepository.create = jest
      .fn()
      .mockImplementation((value) => value) as unknown as Repository<StaffWorkhour>['create'];
    workhourRepository.save = jest
      .fn()
      .mockImplementation(async (value) => ({ ...value, id: 1 })) as unknown as Repository<StaffWorkhour>['save'];
  });

  it('upserts workhour fields from manhours, approved leave, and the active segment', async () => {
    const service = new StaffWorkhourService(
      workhourRepository,
      staffRepository,
      manhourRepository,
      leaveRepository,
      segmentRepository,
    );

    const result = await service.calculate(
      new Date('2024-06-01T00:00:00.000Z'),
    );

    expect(workhourRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: 'A001',
        work_time: 9,
        leave_time: 1,
        overtime: 1,
        late: 15,
      }),
    );
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 1, staffId: 'A001' }),
    );
  });
});
