import { Injectable } from '@nestjs/common';
import { RealandM70Client } from './realand-m70.client';
import {
  ListUsersOptions,
  TimeClockAttendanceLog,
  TimeClockAttendanceLogQuery,
  TimeClockConnectionResult,
  TimeClockDeviceIdentity,
  TimeClockDeviceInfo,
  TimeClockDeviceStatus,
  TimeClockDeviceTime,
  TimeClockUser,
} from './time-clock.types';

/**
 * Backend-only facade for the Realand M70 device.
 *
 * This service deliberately has no persistence and no HTTP controller. Other
 * backend modules can import TimeClockModule and inject this service.
 */
@Injectable()
export class TimeClockService {
  constructor(private readonly client: RealandM70Client) {}

  checkConnection(): Promise<TimeClockConnectionResult> {
    return this.client.checkConnection();
  }

  getDeviceStatus(): Promise<TimeClockDeviceStatus> {
    return this.client.getDeviceStatus();
  }

  getDeviceInfo(): Promise<TimeClockDeviceInfo> {
    return this.client.getDeviceInfo();
  }

  getDeviceIdentity(): Promise<TimeClockDeviceIdentity> {
    return this.client.getDeviceIdentity();
  }

  getDeviceTime(): Promise<TimeClockDeviceTime> {
    return this.client.getDeviceTime();
  }

  setDeviceTime(value: Date): Promise<void> {
    return this.client.setDeviceTime(value);
  }

  listUsers(options?: ListUsersOptions): Promise<TimeClockUser[]> {
    return this.client.listUsers(options);
  }

  getUserName(userId: number): Promise<string> {
    return this.client.getUserName(userId);
  }

  setUserName(userId: number, name: string): Promise<void> {
    return this.client.setUserName(userId, name);
  }

  setUserEnabled(userId: number, enabled: boolean): Promise<void> {
    return this.client.setUserEnabled(userId, enabled);
  }

  getAttendanceLogs(
    query?: TimeClockAttendanceLogQuery,
  ): Promise<TimeClockAttendanceLog[]> {
    return this.client.getAttendanceLogs(query);
  }
}
