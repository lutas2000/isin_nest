import { Repository } from 'typeorm';
import { Staff } from '../staff/entities/staff.entity';
import { AttendRecordMapper, parseDelimitedLine } from './attend-record-mapper';

describe('AttendRecordMapper', () => {
  const staffRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Staff>;
  const mapper = new AttendRecordMapper(staffRepository);

  beforeEach(() => jest.clearAllMocks());

  it('resolves USB names to staff IDs while keeping the legacy string record ID', async () => {
    staffRepository.findOne = jest.fn().mockResolvedValue({ id: 'A001' });
    const row = Array(9).fill('');
    row[2] = '36';
    row[8] = '2024/06/01 09:05:00';

    const record = await mapper.usbCsvToEntity(row);

    expect(record.staffId).toBe('A001');
    expect(record.staffName).toBe('高光達');
    expect(record.id).toBe('1717232700高光達');
    expect(mapper.validateAttendRecord(record)).toBe(true);
  });

  it('rejects unmapped USB employees and invalid calendar dates', async () => {
    staffRepository.findOne = jest.fn().mockResolvedValue(null);
    const row = Array(9).fill('');
    row[3] = '未知員工';
    row[8] = '2024/06/01 09:05:00';
    expect(mapper.validateAttendRecord(await mapper.usbCsvToEntity(row))).toBe(
      false,
    );

    const csv = Array(9).fill('');
    csv[1] = 'A001';
    csv[2] = '張三';
    csv[6] = '2024-06-31 09:05:00';
    expect(mapper.validateAttendRecord(mapper.csvToEntity(csv))).toBe(false);
  });

  it('parses quoted delimiters and escaped quotes', () => {
    expect(parseDelimitedLine('A001,"王,小明","say ""hi"""')).toEqual([
      'A001',
      '王,小明',
      'say "hi"',
    ]);
  });
});
