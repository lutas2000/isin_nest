import { Repository } from 'typeorm';
import { AttendRecord } from '../attend-record/entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';
import {
  TYPE_NEW,
  TYPE_OFF_WORK,
  TYPE_ON_WORK,
  TYPE_UNKNOWN,
  WorkingHours,
} from './working-hours';

describe('WorkingHours', () => {
  const attendRecordRepository = {
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<AttendRecord>;
  const staffRepository = {} as Repository<Staff>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Django attendance constants distinct', () => {
    expect(TYPE_NEW).toBe(0);
    expect(TYPE_ON_WORK).toBe(1);
    expect(TYPE_OFF_WORK).toBe(2);
    expect(TYPE_UNKNOWN).toBe(3);
  });

  it('marks the unmatched duplicate as UNKNOWN and pairs the remaining records', async () => {
    const workingHours = new WorkingHours(
      attendRecordRepository,
      staffRepository,
    );
    const records = [0, 1, 2].map((index) => ({
      id: String(index + 1),
      staffId: 'A001',
      staffName: '張三',
      createTime: new Date(
        `2024-06-01T${String(9 + index).padStart(2, '0')}:00:00.000Z`,
      ),
      attendType: TYPE_NEW,
    })) as AttendRecord[];
    attendRecordRepository.find = jest
      .fn()
      .mockResolvedValue([
        records[0],
      ]) as unknown as Repository<AttendRecord>['find'];
    attendRecordRepository.save = jest
      .fn()
      .mockImplementation(
        async (record) => record,
      ) as unknown as Repository<AttendRecord>['save'];
    jest.spyOn(workingHours, 'findUserRecords').mockResolvedValue([...records]);

    await workingHours.appointAttendRecordsType();

    expect(records[0].attendType).toBe(TYPE_ON_WORK);
    expect(records[1].attendType).toBe(TYPE_UNKNOWN);
    expect(records[2].attendType).toBe(TYPE_OFF_WORK);
    expect(attendRecordRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: '2', attendType: TYPE_UNKNOWN }),
    );
  });

  it('queries attendance by name when device staff ID differs from staff primary key', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    attendRecordRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(
        queryBuilder,
      ) as unknown as Repository<AttendRecord>['createQueryBuilder'];
    const namedStaffRepository = {
      findOne: jest.fn(async ({ where }) =>
        where.name === '張三' ? { id: 'S001', name: '張三' } : null,
      ),
    } as unknown as Repository<Staff>;
    const workingHours = new WorkingHours(
      attendRecordRepository,
      namedStaffRepository,
    );

    await workingHours.findUserRecords({
      staffId: 'A001',
      staffName: '張三',
      createTime: new Date('2024-06-01T09:00:00.000Z'),
    } as AttendRecord);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('staffName'),
      expect.objectContaining({ identifier: '張三' }),
    );
  });
});
