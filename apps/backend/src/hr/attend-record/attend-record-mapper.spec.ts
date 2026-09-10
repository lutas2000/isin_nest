import { Repository } from 'typeorm';
import { AttendRecordMapper } from './attend-record-mapper';
import { Staff } from '../staff/entities/staff.entity';
import {
  TYPE_NEW,
  TYPE_OFF_WORK,
  TYPE_ON_WORK,
  TYPE_UNKNOWN,
} from '../working-hours/working-hours';

describe('AttendRecordMapper', () => {
  const staffRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Staff>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps the Django normal log columns and preserves the recorded time', () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const row = [
      'device-row-id',
      'A001',
      '張三',
      'unused-3',
      'unused-4',
      'unused-5',
      '2024-06-01 09:05:00',
      'unused-7',
      'fingerprint',
    ];

    const result = mapper.csvToEntity(row);

    expect(result.staffId).toBe('A001');
    expect(result.staffName).toBe('張三');
    expect(result.inputType).toBe('fingerprint');
    expect(result.attendType).toBe(TYPE_NEW);
    expect(result.createTime.toISOString()).toBe('2024-06-01T09:05:00.000Z');
  });

  it('maps USB rows using the UID fallback and USB timestamp column', async () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const row = Array.from({ length: 9 }, () => '');
    row[2] = '36';
    row[8] = '2024/06/01 09:05:00';
    staffRepository.findOne = jest.fn().mockResolvedValue({
      id: 'A001',
      name: '高光達',
    }) as unknown as Repository<Staff>['findOne'];

    const result = await mapper.usbCsvToEntity(row);

    expect(result.staffId).toBe('A001');
    expect(result.staffName).toBe('高光達');
    expect(result.inputType).toBe('usb');
    expect(result.attendType).toBe(TYPE_NEW);
    expect(result.createTime.toISOString()).toBe('2024-06-01T09:05:00.000Z');
  });

  it('resolves a USB staff name to the canonical staff ID', async () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const row = Array.from({ length: 9 }, () => '');
    row[2] = '42';
    row[3] = '李四';
    row[8] = '2024/06/01 10:00:00';
    staffRepository.findOne = jest.fn().mockResolvedValue({
      id: 'A002',
      name: '李四',
    }) as unknown as Repository<Staff>['findOne'];

    const result = await mapper.usbCsvToEntity(row);

    expect(staffRepository.findOne).toHaveBeenCalledWith({
      where: { name: '李四' },
    });
    expect(result.staffId).toBe('A002');
    expect(result.staffName).toBe('李四');
  });

  it('does not accept a record that only contains an unknown staff name', async () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const row = Array.from({ length: 9 }, () => '');
    row[2] = '99';
    row[3] = '不存在的人';
    row[8] = '2024/06/01 10:00:00';
    staffRepository.findOne = jest.fn().mockResolvedValue(null) as unknown as Repository<Staff>['findOne'];

    const result = await mapper.usbCsvToEntity(row);

    expect(mapper.validateAttendRecord(result)).toBe(false);
  });

  it('recognizes all persisted attendance states', () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const record = {
      staffId: 'A001',
      createTime: new Date('2024-06-01T09:00:00.000Z'),
    } as any;

    for (const attendType of [TYPE_NEW, TYPE_ON_WORK, TYPE_OFF_WORK, TYPE_UNKNOWN]) {
      record.attendType = attendType;
      expect(mapper.validateAttendRecord(record)).toBe(true);
    }
  });

  it('rejects timestamps that Python strptime would reject', () => {
    const mapper = new AttendRecordMapper(staffRepository);
    const row = [
      'device-row-id',
      'A001',
      '張三',
      '',
      '',
      '',
      '2024-06-31 09:05:00',
      '',
      'fingerprint',
    ];

    const result = mapper.csvToEntity(row);

    expect(mapper.validateAttendRecord(result)).toBe(false);
  });
});
