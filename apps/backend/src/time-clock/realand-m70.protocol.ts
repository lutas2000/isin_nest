import { TimeClockProtocolError } from './time-clock.errors';
import { TimeClockDeviceTime, TimeClockUser } from './time-clock.types';

export const M70_COMMAND = {
  INITIALIZE: 0x0052,
  SET_ENROLL_DATA: 0x0102,
  DELETE_ENROLL_DATA: 0x0103,
  GET_DEVICE_STATUS: 0x0108,
  GET_DEVICE_INFO: 0x0109,
  ENABLE_USER: 0x010d,
  MODIFY_PRIVILEGE: 0x0111,
  GET_DEVICE_TIME: 0x010e,
  READ_ALL_USER_IDS: 0x0112,
  READ_GENERAL_ATTENDANCE_LOGS: 0x0106,
  READ_ALL_ATTENDANCE_LOGS: 0x0107,
  GET_SERIAL_NUMBER: 0x0113,
  GET_BACKUP_NUMBER: 0x0115,
  GET_PRODUCT_CODE: 0x0116,
  GET_USER_NAME: 0x011a,
  SET_USER_NAME: 0x011b,
} as const;

/**
 * SBPCCOMM's SendBigDataX splits a data payload into 0x3fc-byte frames.
 * The value is part of the native DLL implementation, not a TCP MTU guess.
 */
export const M70_MAX_DATA_PAYLOAD = 0x03fc;

export const M70_DEVICE_STATUS_SELECTOR = {
  MANAGER_COUNT: 1,
  USER_COUNT: 2,
  FINGERPRINT_COUNT: 3,
  PASSWORD_COUNT: 4,
  MANAGEMENT_LOG_COUNT: 5,
  ATTENDANCE_LOG_COUNT: 6,
  CARD_COUNT: 7,
  ALARM_BITS: 8,
  FACE_COUNT: 9,
  UNREAD_MANAGEMENT_LOG_COUNT: 10,
  UNREAD_ATTENDANCE_LOG_COUNT: 11,
} as const;

export const M70_DEVICE_INFO_SELECTOR = {
  MAX_MANAGER_COUNT: 1,
  MACHINE_ID: 2,
  LANGUAGE: 3,
  AUTO_POWER_OFF_MINUTES: 4,
  DOOR_OPEN_SECONDS: 5,
  ATTENDANCE_LOG_WARNING_THRESHOLD: 6,
  MANAGEMENT_LOG_WARNING_THRESHOLD: 7,
  DUPLICATE_VERIFY_INTERVAL_SECONDS: 8,
  SERIAL_BAUD_RATE_CODE: 9,
  PARITY: 10,
  STOP_BIT_CODE: 11,
  DATE_SEPARATOR: 12,
  VERIFY_MODE: 13,
  DOOR_CONTROL_MODE: 14,
  DOOR_SENSOR_TYPE: 15,
  DOOR_OPEN_TIMEOUT: 16,
  ANTI_PASSBACK: 17,
  AUTO_SLEEP: 18,
  DAYLIGHT_OFFSET: 19,
  RESERVED_20: 20,
  RESERVED_21: 21,
  RESERVED_22: 22,
  SHOW_REALTIME_CAMERA: 23,
  USE_FAIL_LOG: 24,
} as const;

export function checksum16(data: Uint8Array): number {
  let sum = 0;
  for (const byte of data) {
    sum = (sum + byte) & 0xffff;
  }
  return sum;
}

export function buildCommandFrame(
  dn: number,
  command: number,
  arg2 = 0,
  arg3 = 0,
): Buffer {
  const frame = Buffer.alloc(16);
  frame.writeUInt16LE(0xaa55, 0);
  frame.writeUInt16LE(dn, 2);
  frame.writeUInt16LE(0x1979, 4);
  frame.writeUInt16LE(command, 6);
  frame.writeUInt32LE(arg3 >>> 0, 8);
  frame.writeUInt16LE(arg2 & 0xffff, 12);
  frame.writeUInt16LE(checksum16(frame.subarray(0, 14)), 14);
  return frame;
}

export function buildDataFrame(dn: number, payload: Uint8Array): Buffer {
  const frame = Buffer.alloc(payload.length + 6);
  frame.writeUInt16BE(0xa55a, 0);
  frame.writeUInt16LE(dn, 2);
  Buffer.from(payload).copy(frame, 4);
  frame.writeUInt16LE(
    checksum16(frame.subarray(0, frame.length - 2)),
    frame.length - 2,
  );
  return frame;
}

/**
 * SendBigDataX uses the alternate 5a a5 header used by M70 write payloads.
 */
export function buildBigDataFrame(dn: number, payload: Uint8Array): Buffer {
  const frame = Buffer.alloc(payload.length + 6);
  frame.writeUInt16BE(0x5aa5, 0);
  frame.writeUInt16LE(dn, 2);
  Buffer.from(payload).copy(frame, 4);
  frame.writeUInt16LE(
    checksum16(frame.subarray(0, frame.length - 2)),
    frame.length - 2,
  );
  return frame;
}

export interface M70AckFrame {
  dn: number;
  resultWord: number;
  raw: Buffer;
}

export interface M70ResultFrame {
  dn: number;
  status: number;
  word: number;
  value: number;
  raw: Buffer;
}

export function parseAckFrame(frame: Buffer, expectedDn: number): M70AckFrame {
  if (frame.length !== 8) {
    throw new TimeClockProtocolError(
      `M70 ACK length must be 8 bytes, received ${frame.length}`,
    );
  }

  if (frame.readUInt16BE(0) !== 0x5aa5) {
    throw new TimeClockProtocolError(
      `Unexpected M70 ACK header: ${frame.toString('hex')}`,
    );
  }

  const dn = frame.readUInt16LE(2);
  if (dn !== expectedDn) {
    throw new TimeClockProtocolError(
      `M70 ACK DN mismatch: expected ${expectedDn}, received ${dn}`,
    );
  }

  const expectedChecksum = frame.readUInt16LE(6);
  const actualChecksum = checksum16(frame.subarray(0, 6));
  if (actualChecksum !== expectedChecksum) {
    throw new TimeClockProtocolError(
      `M70 ACK checksum mismatch: expected ${expectedChecksum}, calculated ${actualChecksum}`,
    );
  }

  return {
    dn,
    resultWord: frame.readUInt16LE(4),
    raw: Buffer.from(frame),
  };
}

export function parseResultFrame(
  frame: Buffer,
  expectedDn: number,
  command?: number,
): M70ResultFrame {
  if (frame.length !== 14) {
    throw new TimeClockProtocolError(
      `M70 result length must be 14 bytes, received ${frame.length}`,
      command,
    );
  }

  if (frame.readUInt16BE(0) !== 0xaa55) {
    throw new TimeClockProtocolError(
      `Unexpected M70 result header: ${frame.toString('hex')}`,
      command,
    );
  }

  const dn = frame.readUInt16LE(2);
  if (dn !== expectedDn) {
    throw new TimeClockProtocolError(
      `M70 result DN mismatch: expected ${expectedDn}, received ${dn}`,
      command,
    );
  }

  const expectedChecksum = frame.readUInt16LE(12);
  const actualChecksum = checksum16(frame.subarray(0, 12));
  if (actualChecksum !== expectedChecksum) {
    throw new TimeClockProtocolError(
      `M70 result checksum mismatch: expected ${expectedChecksum}, calculated ${actualChecksum}`,
      command,
    );
  }

  return {
    dn,
    status: frame.readUInt16LE(4),
    word: frame.readUInt16LE(6),
    value: frame.readUInt32LE(8),
    raw: Buffer.from(frame),
  };
}

export function parseDataFrame(
  frame: Buffer,
  expectedDn: number,
  expectedPayloadLength: number,
  command?: number,
): Buffer {
  const expectedLength = expectedPayloadLength + 6;
  if (frame.length !== expectedLength) {
    throw new TimeClockProtocolError(
      `M70 data frame length must be ${expectedLength} bytes, received ${frame.length}`,
      command,
    );
  }

  const magic = frame.readUInt16BE(0);
  if (magic !== 0xa55a && magic !== 0x5aa5) {
    throw new TimeClockProtocolError(
      `Unexpected M70 data frame header: ${frame.toString('hex')}`,
      command,
    );
  }

  const dn = frame.readUInt16LE(2);
  if (dn !== expectedDn) {
    throw new TimeClockProtocolError(
      `M70 data frame DN mismatch: expected ${expectedDn}, received ${dn}`,
      command,
    );
  }

  const expectedChecksum = frame.readUInt16LE(frame.length - 2);
  const actualChecksum = checksum16(frame.subarray(0, frame.length - 2));
  if (actualChecksum !== expectedChecksum) {
    throw new TimeClockProtocolError(
      `M70 data frame checksum mismatch: expected ${expectedChecksum}, calculated ${actualChecksum}`,
      command,
    );
  }

  return Buffer.from(frame.subarray(4, frame.length - 2));
}

export interface M70GeneralLogCursor {
  totalLogs: number;
  firstUnreadIndex: number;
  unreadCount: number;
}

/**
 * ReadGeneralLogData (0x0106) returns the number of stored logs in its result
 * and the first unread index in a four-byte data frame.
 */
export function parseM70GeneralLogCursor(
  cursorPayload: Buffer,
  totalLogs: number,
): M70GeneralLogCursor {
  if (cursorPayload.length !== 4) {
    throw new TimeClockProtocolError(
      `M70 general-log cursor payload must be 4 bytes, received ${cursorPayload.length}`,
      M70_COMMAND.READ_GENERAL_ATTENDANCE_LOGS,
    );
  }
  if (!Number.isInteger(totalLogs) || totalLogs < 0 || totalLogs > 100000) {
    throw new TimeClockProtocolError(
      `M70 returned unreasonable attendance count ${totalLogs}`,
      M70_COMMAND.READ_GENERAL_ATTENDANCE_LOGS,
    );
  }

  const firstUnreadIndex = cursorPayload.readUInt32LE(0);
  if (firstUnreadIndex > totalLogs) {
    throw new TimeClockProtocolError(
      `M70 general-log cursor ${firstUnreadIndex} exceeds total log count ${totalLogs}`,
      M70_COMMAND.READ_GENERAL_ATTENDANCE_LOGS,
    );
  }

  return {
    totalLogs,
    firstUnreadIndex,
    unreadCount: totalLogs - firstUnreadIndex,
  };
}

export function decodeM70DeviceTime(payload: Buffer): TimeClockDeviceTime {
  if (payload.length < 4) {
    throw new TimeClockProtocolError('M70 device time payload must be 4 bytes');
  }

  const rawSeconds = payload.readUInt32LE(0);
  const epoch = Date.UTC(2000, 0, 1);
  const date = new Date(epoch + rawSeconds * 1000);

  return {
    date,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    rawSeconds,
  };
}

/** M70 v3.6.8 general log rows captured from the device are 12 bytes. */
export function decodeM70AttendanceLogs(payload: Buffer): {
  userId: string;
  clock: Date;
  verifyMode: number;
  action: number;
  raw: Buffer;
}[] {
  if (payload.length % 12 !== 0) {
    throw new TimeClockProtocolError(
      'M70 attendance payload is not a multiple of 12 bytes',
    );
  }
  const rows: {
    userId: string;
    clock: Date;
    verifyMode: number;
    action: number;
    raw: Buffer;
  }[] = [];
  for (let offset = 0; offset < payload.length; offset += 12) {
    const raw = Buffer.from(payload.subarray(offset, offset + 12));
    const clock = decodeM70DeviceTime(raw.subarray(0, 4)).date;
    if (clock.getUTCFullYear() > 2099 || raw.readUInt32LE(4) === 0) {
      throw new TimeClockProtocolError(
        'M70 attendance row has invalid time or user ID',
      );
    }
    rows.push({
      userId: String(raw.readUInt32LE(4)),
      clock,
      verifyMode: raw[8],
      action: raw[9],
      raw,
    });
  }
  return rows;
}

export function encodeM70DeviceTime(value: Date): Buffer {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TimeClockProtocolError('Invalid device time');
  }

  const epoch = Date.UTC(2000, 0, 1);
  const rawSeconds = Math.floor((value.getTime() - epoch) / 1000);
  const maxSeconds = Math.floor(
    (Date.UTC(2099, 11, 31, 23, 59, 59) - epoch) / 1000,
  );

  if (rawSeconds < 0 || rawSeconds > maxSeconds) {
    throw new TimeClockProtocolError(
      'M70 device time must be between 2000-01-01 and 2099-12-31',
    );
  }

  const payload = Buffer.alloc(4);
  payload.writeUInt32LE(rawSeconds >>> 0, 0);
  return payload;
}

export function decodeM70Text(payload: Buffer): string {
  // Serial/product fields on this firmware are ASCII; enrolled names are
  // UTF-16LE. ASCII pairs can look like valid CJK when decoded as UTF-16.
  const nul = payload.indexOf(0);
  const asciiEnd = nul < 0 ? payload.length : nul;
  if (asciiEnd > 1 && payload.subarray(0, asciiEnd).every((byte) => byte >= 0x20 && byte <= 0x7e) &&
      (nul < 0 || payload.subarray(nul).every((byte) => byte === 0)))
    return payload.subarray(0, asciiEnd).toString('ascii').trim();
  const utf16 = payload
    .toString('utf16le')
    .replace(/\u0000+$/g, '')
    .trim();

  if (utf16 && [...utf16].every((char) => char >= ' ' || char === '\n')) {
    return utf16;
  }

  return payload
    .toString('latin1')
    .replace(/\u0000+$/g, '')
    .trim();
}

export function encodeM70Text(value: string, byteLength = 48): Buffer {
  const encoded = Buffer.from(value, 'utf16le');
  if (encoded.length > byteLength) {
    throw new TimeClockProtocolError(
      `M70 text must fit in ${byteLength} bytes, received ${encoded.length}`,
    );
  }

  const result = Buffer.alloc(byteLength);
  encoded.copy(result);
  return result;
}

export function decodeM70UserSummary(payload: Buffer): TimeClockUser[] {
  const recordLength = 8;
  if (payload.length % recordLength !== 0) {
    throw new TimeClockProtocolError(
      `M70 user summary length ${payload.length} is not divisible by ${recordLength}`,
    );
  }

  const users: TimeClockUser[] = [];
  for (let offset = 0; offset < payload.length; offset += recordLength) {
    const raw = Buffer.from(payload.subarray(offset, offset + recordLength));
    users.push({
      userId: raw.readUInt32LE(0),
      raw,
    });
  }
  return users;
}
