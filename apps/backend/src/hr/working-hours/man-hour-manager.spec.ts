import { Repository } from 'typeorm';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { Staff } from '../staff/entities/staff.entity';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';

describe('ManHourManager', () => {
  const staffManhourRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<StaffManhour>;
  const staffRepository = {
    createQueryBuilder: jest.fn(),
  } as unknown as Repository<Staff>;
  const workingHours = {
    findUserRecords2: jest.fn(),
  } as unknown as WorkingHours;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses staff IDs for lookup, deletion, and generated manhour rows', async () => {
    const staffQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: 'A001', name: '張三', need_check: true },
      ]),
    };
    staffRepository.createQueryBuilder = jest
      .fn()
      .mockReturnValue(staffQueryBuilder) as unknown as Repository<Staff>['createQueryBuilder'];

    const start = new Date('2024-06-01T09:00:00.000Z');
    const end = new Date('2024-06-01T18:00:00.000Z');
    const createdManhour = { staffId: 'A001' } as StaffManhour;
    staffManhourRepository.delete = jest
      .fn()
      .mockResolvedValue({ affected: 0 }) as unknown as Repository<StaffManhour>['delete'];
    staffManhourRepository.create = jest
      .fn()
      .mockImplementation((value) => ({ ...value })) as unknown as Repository<StaffManhour>['create'];
    staffManhourRepository.save = jest
      .fn()
      .mockResolvedValue({ ...createdManhour, id: 1 }) as unknown as Repository<StaffManhour>['save'];
    workingHours.findUserRecords2 = jest
      .fn()
      .mockImplementation(async (_staffId: string, _date: Date, attendType: number) =>
        attendType === 1
          ? [{ staffId: 'A001', createTime: start }]
          : [{ staffId: 'A001', createTime: end }],
      ) as unknown as WorkingHours['findUserRecords2'];

    const manager = new ManHourManager(
      staffManhourRepository,
      staffRepository,
      workingHours,
    );

    await manager.calculateManHour(new Date('2024-06-01T00:00:00.000Z'));

    expect(workingHours.findUserRecords2).toHaveBeenNthCalledWith(
      1,
      'A001',
      expect.any(Date),
      1,
    );
    expect(staffManhourRepository.delete).toHaveBeenCalledWith({
      staffId: 'A001',
      day: expect.any(Date),
    });
    expect(staffManhourRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ staffId: 'A001', work_time: 9 }),
    );
  });
});
