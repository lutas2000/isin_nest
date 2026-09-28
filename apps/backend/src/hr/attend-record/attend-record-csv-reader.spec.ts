import { Repository } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';
import { AttendRecord } from './entities/attend-record.entity';
import { AttendRecordCsvReader } from './attend-record-csv-reader';
import { AttendRecordMapper } from './attend-record-mapper';

describe('AttendRecordCsvReader', () => {
  it('does not reset an already classified punch on reimport', async () => {
    const existing = { id: '1717232700張三', attendType: 1 } as AttendRecord;
    const attendRecordRepository = {
      findOne: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    } as unknown as Repository<AttendRecord>;
    const mapper = {
      csvToEntity: jest.fn().mockReturnValue({ ...existing, attendType: 0 }),
      validateAttendRecord: jest.fn().mockReturnValue(true),
    } as unknown as AttendRecordMapper;
    const reader = new AttendRecordCsvReader(
      attendRecordRepository,
      {} as Repository<Staff>,
      mapper,
    );

    await reader['readRow']([], 'log.txt', 1);

    expect(attendRecordRepository.findOne).toHaveBeenCalledWith({
      where: { id: existing.id },
    });
    expect(attendRecordRepository.save).not.toHaveBeenCalled();
  });
});
