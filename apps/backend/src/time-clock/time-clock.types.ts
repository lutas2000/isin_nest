export interface TimeClockModuleOptions {
  host?: string;
  port?: number;
  dn?: number;
  password?: number;
  timeoutMs?: number;
}

export interface ResolvedTimeClockOptions {
  host: string;
  port: number;
  dn: number;
  password: number;
  timeoutMs: number;
}

export interface TimeClockConnectionResult {
  host: string;
  port: number;
  dn: number;
  latencyMs: number;
}

export interface TimeClockDeviceStatus {
  managerCount: number;
  userCount: number;
  fingerprintCount: number;
  passwordCount: number;
  managementLogCount: number;
  attendanceLogCount: number;
  cardCount: number;
  alarmBits: number;
  faceCount: number;
  unreadManagementLogCount: number;
  unreadAttendanceLogCount: number;
  raw: Record<number, number>;
}

export interface TimeClockDeviceInfo {
  maxManagerCount: number;
  machineId: number;
  language: number;
  autoPowerOffMinutes: number;
  doorOpenSeconds: number;
  attendanceLogWarningThreshold: number;
  managementLogWarningThreshold: number;
  duplicateVerifyIntervalSeconds: number;
  serialBaudRateCode: number;
  parity: number;
  stopBitCode: number;
  dateSeparator: number;
  verifyMode: number;
  doorControlMode: number;
  doorSensorType: number;
  doorOpenTimeout: number;
  antiPassback: number;
  autoSleep: number;
  daylightOffset: number;
  showRealtimeCamera: number;
  useFailLog: number;
  raw: Record<number, number>;
}

export interface TimeClockDeviceIdentity {
  serialNumber: string;
  backupNumber: number;
  productCode: string;
}

export interface TimeClockDeviceTime {
  date: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  rawSeconds: number;
}

export interface TimeClockUser {
  userId: number;
  name?: string;
  raw: Buffer;
}

export interface ListUsersOptions {
  includeNames?: boolean;
}

export interface TimeClockAttendanceLogQuery {
  startDate?: Date;
  endDate?: Date;
  markAsRead?: boolean;
  includeAll?: boolean;
}

export interface TimeClockAttendanceLog {
  index: number;
  deviceNumber?: number;
  userId?: string;
  clock?: Date;
  verifyMode?: number;
  action?: number;
  remark?: string;
  masterDeviceNumber?: string;
  raw: Buffer;
}
