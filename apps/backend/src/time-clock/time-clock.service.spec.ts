import { TimeClockService } from './time-clock.service';
import { TimeClockUnsupportedError } from './time-clock.errors';
import {
  TimeClockDeviceStatus,
  TimeClockDeviceTime,
  TimeClockUser,
  TimeClockUserUpsert,
} from './time-clock.types';

describe('TimeClockService', () => {
  const status: TimeClockDeviceStatus = {
    managerCount: 1,
    userCount: 2,
    fingerprintCount: 3,
    passwordCount: 0,
    managementLogCount: 4,
    attendanceLogCount: 5,
    cardCount: 0,
    alarmBits: 0,
    faceCount: 2,
    unreadManagementLogCount: 4,
    unreadAttendanceLogCount: 1,
    raw: { 1: 1 },
  };
  const deviceTime: TimeClockDeviceTime = {
    date: new Date(Date.UTC(2026, 8, 10, 12, 0, 0)),
    year: 2026,
    month: 9,
    day: 10,
    hour: 12,
    minute: 0,
    second: 0,
    rawSeconds: 1,
  };
  const users: TimeClockUser[] = [
    { userId: 1001, name: '王小明', raw: Buffer.alloc(8) },
  ];

  it('delegates device read functions to the client', async () => {
    const client = {
      checkConnection: jest.fn().mockResolvedValue({ latencyMs: 1 }),
      getDeviceStatus: jest.fn().mockResolvedValue(status),
      getDeviceInfo: jest.fn().mockResolvedValue({ raw: {} }),
      getDeviceIdentity: jest.fn().mockResolvedValue({}),
      getDeviceTime: jest.fn().mockResolvedValue(deviceTime),
      listUsers: jest.fn().mockResolvedValue(users),
      getUserName: jest.fn().mockResolvedValue('王小明'),
      setDeviceTime: jest.fn(),
      setUserName: jest.fn(),
      upsertUser: jest.fn(),
      deleteUser: jest.fn(),
      setUserEnabled: jest.fn(),
      getAttendanceLogs: jest.fn().mockResolvedValue([]),
    };
    const service = new TimeClockService(client as never);

    await expect(service.getDeviceStatus()).resolves.toBe(status);
    await expect(service.getDeviceTime()).resolves.toBe(deviceTime);
    await expect(service.listUsers()).resolves.toBe(users);
    await expect(service.getUserName(1001)).resolves.toBe('王小明');
    const upsert: TimeClockUserUpsert = {
      userId: 1001,
      name: '王小明',
      password: '1234',
    };
    await service.upsertUser(upsert);
    await service.deleteUser(1001);
    expect(client.getDeviceStatus).toHaveBeenCalledTimes(1);
    expect(client.getDeviceTime).toHaveBeenCalledTimes(1);
    expect(client.upsertUser).toHaveBeenCalledWith(upsert);
    expect(client.deleteUser).toHaveBeenCalledWith(1001);
  });

  it('does not silently issue still-unverified write or log commands', async () => {
    const client = {
      setDeviceTime: jest
        .fn()
        .mockRejectedValue(
          new TimeClockUnsupportedError('write frame not verified'),
        ),
      setUserEnabled: jest
        .fn()
        .mockRejectedValue(
          new TimeClockUnsupportedError('write frame not verified'),
        ),
      getAttendanceLogs: jest
        .fn()
        .mockRejectedValue(
          new TimeClockUnsupportedError('log frame not verified'),
        ),
    };
    const service = new TimeClockService(client as never);

    await expect(service.setDeviceTime(new Date())).rejects.toBeInstanceOf(
      TimeClockUnsupportedError,
    );
    await expect(service.setUserEnabled(1001, true)).rejects.toBeInstanceOf(
      TimeClockUnsupportedError,
    );
    await expect(service.getAttendanceLogs()).rejects.toBeInstanceOf(
      TimeClockUnsupportedError,
    );
  });
});
