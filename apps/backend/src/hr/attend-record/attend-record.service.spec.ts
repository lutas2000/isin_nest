import { Repository, SelectQueryBuilder } from 'typeorm';
import { AttendRecord } from './entities/attend-record.entity';
import { AttendRecordService } from './attend-record.service';
import { Staff } from '../staff/entities/staff.entity';
import {
  AttendRecordCsvReader,
  AttendRecordUsbReader,
} from './attend-record-csv-reader';

describe('AttendRecordService', () => {
  it('treats a YYYY-MM-DD end date as the end of that UTC day', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as unknown as SelectQueryBuilder<AttendRecord>;
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<AttendRecord>;
    const service = new AttendRecordService(
      repository,
      {} as Repository<Staff>,
      {} as AttendRecordCsvReader,
      {} as AttendRecordUsbReader,
    );

    await service.findByDateRange(
      new Date('2024-06-01'),
      new Date('2024-06-01'),
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'attendRecord.createTime <= :endDate',
      { endDate: new Date('2024-06-01T23:59:59.999Z') },
    );
  });
});
