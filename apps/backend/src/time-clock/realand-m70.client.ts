import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'node:net';
import {
  TimeClockConnectionError,
  TimeClockProtocolError,
  TimeClockUnsupportedError,
} from './time-clock.errors';
import {
  buildCommandFrame,
  buildBigDataFrame,
  decodeM70DeviceTime,
  decodeM70AttendanceLogs,
  decodeM70Text,
  decodeM70UserSummary,
  encodeM70DeviceTime,
  encodeM70Text,
  M70_COMMAND,
  M70_DEVICE_INFO_SELECTOR,
  M70_DEVICE_STATUS_SELECTOR,
  M70_MAX_DATA_PAYLOAD,
  parseAckFrame,
  parseDataFrame,
  parseResultFrame,
} from './realand-m70.protocol';
import {
  ListUsersOptions,
  ResolvedTimeClockOptions,
  TimeClockAttendanceLog,
  TimeClockAttendanceLogQuery,
  TimeClockConnectionResult,
  TimeClockDeviceIdentity,
  TimeClockDeviceInfo,
  TimeClockDeviceStatus,
  TimeClockDeviceTime,
  TimeClockModuleOptions,
  TimeClockUser,
  TimeClockUserUpsert,
} from './time-clock.types';
import { TIME_CLOCK_OPTIONS } from './time-clock.constants';

const DEFAULT_OPTIONS: ResolvedTimeClockOptions = {
  host: '192.168.0.223',
  port: 5005,
  dn: 3,
  password: 0,
  timeoutMs: 5000,
};

interface ReadWaiter {
  length: number;
  resolve: (value: Buffer) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

class M70Session {
  private socket: net.Socket | undefined;
  private receiveBuffer = Buffer.alloc(0);
  private readWaiter: ReadWaiter | undefined;
  private terminalError: Error | undefined;

  constructor(private readonly options: ResolvedTimeClockOptions) {}

  async open(): Promise<void> {
    if (this.socket) return;

    const socket = new net.Socket();
    this.socket = socket;
    socket.setTimeout(this.options.timeoutMs);
    socket.on('data', (chunk: Buffer) => this.handleData(chunk));
    socket.on('timeout', () => {
      this.handleError(
        new TimeClockConnectionError(
          `M70 socket timed out after ${this.options.timeoutMs}ms`,
        ),
      );
    });
    socket.on('error', (error: Error) => this.handleError(error));
    socket.on('close', () => {
      if (!this.terminalError) {
        this.handleError(new TimeClockConnectionError('M70 socket closed'));
      }
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new TimeClockConnectionError(
            `Unable to connect to M70 at ${this.options.host}:${this.options.port}`,
          ),
        );
        socket.destroy();
      }, this.options.timeoutMs);

      socket.connect(this.options.port, this.options.host, () => {
        clearTimeout(timer);
        resolve();
      });

      socket.once('error', (error: Error) => {
        clearTimeout(timer);
        reject(
          new TimeClockConnectionError(
            `Unable to connect to M70 at ${this.options.host}:${this.options.port}: ${error.message}`,
          ),
        );
      });
    });

    await this.requestResult(M70_COMMAND.INITIALIZE, 1, 0);
  }

  close(): void {
    this.rejectReadWaiter(new TimeClockConnectionError('M70 session closed'));
    this.socket?.destroy();
    this.socket = undefined;
  }

  async requestResult(
    command: number,
    arg2 = 0,
    arg3 = 0,
  ): Promise<ReturnType<typeof parseResultFrame>> {
    await this.send(buildCommandFrame(this.options.dn, command, arg2, arg3));
    const ack = parseAckFrame(await this.readExact(8), this.options.dn);
    if (ack.resultWord === 0) {
      // The device uses a non-zero result word for a successful ACK.
      throw new TimeClockProtocolError(
        `M70 rejected command 0x${command.toString(16)}`,
        command,
      );
    }

    return parseResultFrame(await this.readExact(14), this.options.dn, command);
  }

  async requestWrite(
    command: number,
    arg2 = 0,
    arg3 = 0,
    payload?: Buffer,
  ): Promise<ReturnType<typeof parseResultFrame>> {
    if (!payload || payload.length === 0)
      return this.requestResult(command, arg2, arg3);

    await this.send(buildCommandFrame(this.options.dn, command, arg2, arg3));
    const ack = parseAckFrame(await this.readExact(8), this.options.dn);
    if (ack.resultWord === 0)
      throw new TimeClockProtocolError(`M70 rejected command 0x${command.toString(16)}`, command);

    for (
      let offset = 0;
      offset < payload.length;
      offset += M70_MAX_DATA_PAYLOAD
    ) {
      await this.send(
        buildBigDataFrame(
          this.options.dn,
          payload.subarray(offset, offset + M70_MAX_DATA_PAYLOAD),
        ),
      );
    }

    // The firmware waits for big-data payload after ACK. It sends the
    // command-result frame only after consuming that payload.
    return parseResultFrame(await this.readExact(14), this.options.dn, command);
  }

  async requestData(
    command: number,
    expectedPayloadLength: number,
    arg2 = 0,
    arg3 = 0,
  ): Promise<{ payload: Buffer; result: ReturnType<typeof parseResultFrame> }> {
    await this.send(buildCommandFrame(this.options.dn, command, arg2, arg3));
    const ack = parseAckFrame(await this.readExact(8), this.options.dn);
    if (ack.resultWord === 0) {
      throw new TimeClockProtocolError(
        `M70 rejected command 0x${command.toString(16)}`,
        command,
      );
    }

    // Firmware variants use both ACK -> result -> data and ACK -> data ->
    // result. Peek at the next frame magic instead of assuming one order.
    const prefix = await this.readExact(2);
    const magic = prefix.readUInt16BE(0);

    if (magic === 0xaa55) {
      const result = parseResultFrame(
        Buffer.concat([prefix, await this.readExact(12)]),
        this.options.dn,
        command,
      );
      const payload = parseDataFrame(
        await this.readExact(expectedPayloadLength + 6),
        this.options.dn,
        expectedPayloadLength,
        command,
      );
      return { payload, result };
    }

    if (magic === 0xa55a || magic === 0x5aa5) {
      const payload = parseDataFrame(
        Buffer.concat([
          prefix,
          await this.readExact(expectedPayloadLength + 4),
        ]),
        this.options.dn,
        expectedPayloadLength,
        command,
      );
      const result = parseResultFrame(
        await this.readExact(14),
        this.options.dn,
        command,
      );
      return { payload, result };
    }

    throw new TimeClockProtocolError(
      `Unexpected M70 data/result frame header: ${prefix.toString('hex')}`,
      command,
    );
  }

  async requestVariableData(
    command: number,
    recordLength: number,
    arg2 = 0,
    arg3 = 0,
  ): Promise<{ payload: Buffer; result: ReturnType<typeof parseResultFrame> }> {
    await this.send(buildCommandFrame(this.options.dn, command, arg2, arg3));
    const ack = parseAckFrame(await this.readExact(8), this.options.dn);
    if (ack.resultWord === 0) {
      throw new TimeClockProtocolError(
        `M70 rejected command 0x${command.toString(16)}`,
        command,
      );
    }

    const result = parseResultFrame(
      await this.readExact(14),
      this.options.dn,
      command,
    );
    if (!Number.isInteger(recordLength) || recordLength <= 0) {
      throw new TimeClockProtocolError(
        'M70 record length must be positive',
        command,
      );
    }
    if (result.value > 100000) {
      throw new TimeClockProtocolError(
        `M70 returned unreasonable record count ${result.value}`,
        command,
      );
    }

    const payload = parseDataFrame(
      await this.readExact(result.value * recordLength + 6),
      this.options.dn,
      result.value * recordLength,
      command,
    );
    return { payload, result };
  }

  async readAllAttendanceLogs(): Promise<Buffer> {
    const command = M70_COMMAND.READ_ALL_ATTENDANCE_LOGS;
    const count = (await this.requestResult(command)).value;
    if (count === 0) return Buffer.alloc(0);
    if (count > 100000) {
      throw new TimeClockProtocolError(
        `M70 returned unreasonable attendance count ${count}`,
        command,
      );
    }

    // Verified against M70 v3.6.8: second command, a 4-byte read-mode
    // payload, result, 8-byte count frame, then 0x3fc-byte data chunks.
    await this.send(buildCommandFrame(this.options.dn, command, 1, count));
    const ack = parseAckFrame(await this.readExact(8), this.options.dn);
    if (ack.resultWord === 0)
      throw new TimeClockProtocolError(
        'M70 rejected attendance transfer',
        command,
      );
    const readMode = Buffer.alloc(4);
    readMode.writeUInt32LE(1);
    await this.send(buildBigDataFrame(this.options.dn, readMode));
    const result = parseResultFrame(
      await this.readExact(14),
      this.options.dn,
      command,
    );
    if (result.value !== count || result.word === 0) {
      throw new TimeClockProtocolError(
        'M70 attendance transfer count mismatch',
        command,
      );
    }
    const header = parseDataFrame(
      await this.readExact(14),
      this.options.dn,
      8,
      command,
    );
    if (header.readUInt32LE(0) !== count) {
      throw new TimeClockProtocolError(
        'M70 attendance data header count mismatch',
        command,
      );
    }
    const chunks: Buffer[] = [];
    let remaining = count * 12;
    while (remaining > 0) {
      const size = Math.min(M70_MAX_DATA_PAYLOAD, remaining);
      chunks.push(
        parseDataFrame(
          await this.readExact(size + 6),
          this.options.dn,
          size,
          command,
        ),
      );
      remaining -= size;
    }
    return Buffer.concat(chunks);
  }

  private async send(frame: Buffer): Promise<void> {
    if (!this.socket || this.terminalError) {
      throw (
        this.terminalError ??
        new TimeClockConnectionError('M70 is not connected')
      );
    }

    await new Promise<void>((resolve, reject) => {
      this.socket?.write(frame, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private readExact(length: number): Promise<Buffer> {
    if (length < 0) {
      return Promise.reject(
        new TimeClockProtocolError('Read length cannot be negative'),
      );
    }

    if (this.terminalError) {
      return Promise.reject(this.terminalError);
    }

    if (this.receiveBuffer.length >= length) {
      const result = this.receiveBuffer.subarray(0, length);
      this.receiveBuffer = this.receiveBuffer.subarray(length);
      return Promise.resolve(Buffer.from(result));
    }

    if (this.readWaiter) {
      return Promise.reject(
        new TimeClockProtocolError(
          'M70 protocol reader received concurrent reads',
        ),
      );
    }

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readWaiter = undefined;
        reject(
          new TimeClockConnectionError(
            `M70 response timed out while waiting for ${length} bytes`,
          ),
        );
      }, this.options.timeoutMs);
      this.readWaiter = { length, resolve, reject, timer };
    });
  }

  private handleData(chunk: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
    this.flushReadWaiter();
  }

  private flushReadWaiter(): void {
    const waiter = this.readWaiter;
    if (!waiter || this.receiveBuffer.length < waiter.length) return;

    clearTimeout(waiter.timer);
    this.readWaiter = undefined;
    const result = this.receiveBuffer.subarray(0, waiter.length);
    this.receiveBuffer = this.receiveBuffer.subarray(waiter.length);
    waiter.resolve(Buffer.from(result));
  }

  private handleError(error: Error): void {
    if (!this.terminalError) {
      this.terminalError = error;
    }
    this.rejectReadWaiter(this.terminalError);
  }

  private rejectReadWaiter(error: Error): void {
    if (!this.readWaiter) return;
    clearTimeout(this.readWaiter.timer);
    const waiter = this.readWaiter;
    this.readWaiter = undefined;
    waiter.reject(error);
  }
}

@Injectable()
export class RealandM70Client {
  private readonly options: ResolvedTimeClockOptions;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly configService: ConfigService,
    @Inject(TIME_CLOCK_OPTIONS)
    moduleOptions: TimeClockModuleOptions = {},
  ) {
    this.options = resolveOptions(configService, moduleOptions);
  }

  get connectionOptions(): ResolvedTimeClockOptions {
    return { ...this.options };
  }

  async checkConnection(): Promise<TimeClockConnectionResult> {
    return this.enqueue(async () => {
      const startedAt = Date.now();
      await this.withSession(async () => undefined);
      return {
        host: this.options.host,
        port: this.options.port,
        dn: this.options.dn,
        latencyMs: Date.now() - startedAt,
      };
    });
  }

  async getDeviceStatus(): Promise<TimeClockDeviceStatus> {
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const raw: Record<number, number> = {};
        for (const selector of Object.values(M70_DEVICE_STATUS_SELECTOR)) {
          const result = await session.requestResult(
            M70_COMMAND.GET_DEVICE_STATUS,
            selector,
            0,
          );
          raw[selector] = result.value;
        }

        return {
          managerCount: raw[M70_DEVICE_STATUS_SELECTOR.MANAGER_COUNT] ?? 0,
          userCount: raw[M70_DEVICE_STATUS_SELECTOR.USER_COUNT] ?? 0,
          fingerprintCount:
            raw[M70_DEVICE_STATUS_SELECTOR.FINGERPRINT_COUNT] ?? 0,
          passwordCount: raw[M70_DEVICE_STATUS_SELECTOR.PASSWORD_COUNT] ?? 0,
          managementLogCount:
            raw[M70_DEVICE_STATUS_SELECTOR.MANAGEMENT_LOG_COUNT] ?? 0,
          attendanceLogCount:
            raw[M70_DEVICE_STATUS_SELECTOR.ATTENDANCE_LOG_COUNT] ?? 0,
          cardCount: raw[M70_DEVICE_STATUS_SELECTOR.CARD_COUNT] ?? 0,
          alarmBits: raw[M70_DEVICE_STATUS_SELECTOR.ALARM_BITS] ?? 0,
          faceCount: raw[M70_DEVICE_STATUS_SELECTOR.FACE_COUNT] ?? 0,
          unreadManagementLogCount:
            raw[M70_DEVICE_STATUS_SELECTOR.UNREAD_MANAGEMENT_LOG_COUNT] ?? 0,
          unreadAttendanceLogCount:
            raw[M70_DEVICE_STATUS_SELECTOR.UNREAD_ATTENDANCE_LOG_COUNT] ?? 0,
          raw,
        };
      }),
    );
  }

  async getDeviceInfo(): Promise<TimeClockDeviceInfo> {
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const raw: Record<number, number> = {};
        for (const selector of Object.values(M70_DEVICE_INFO_SELECTOR)) {
          const result = await session.requestResult(
            M70_COMMAND.GET_DEVICE_INFO,
            selector,
            0,
          );
          raw[selector] = result.value;
        }

        return {
          maxManagerCount: raw[M70_DEVICE_INFO_SELECTOR.MAX_MANAGER_COUNT] ?? 0,
          machineId: raw[M70_DEVICE_INFO_SELECTOR.MACHINE_ID] ?? 0,
          language: raw[M70_DEVICE_INFO_SELECTOR.LANGUAGE] ?? 0,
          autoPowerOffMinutes:
            raw[M70_DEVICE_INFO_SELECTOR.AUTO_POWER_OFF_MINUTES] ?? 0,
          doorOpenSeconds: raw[M70_DEVICE_INFO_SELECTOR.DOOR_OPEN_SECONDS] ?? 0,
          attendanceLogWarningThreshold:
            raw[M70_DEVICE_INFO_SELECTOR.ATTENDANCE_LOG_WARNING_THRESHOLD] ?? 0,
          managementLogWarningThreshold:
            raw[M70_DEVICE_INFO_SELECTOR.MANAGEMENT_LOG_WARNING_THRESHOLD] ?? 0,
          duplicateVerifyIntervalSeconds:
            raw[M70_DEVICE_INFO_SELECTOR.DUPLICATE_VERIFY_INTERVAL_SECONDS] ??
            0,
          serialBaudRateCode:
            raw[M70_DEVICE_INFO_SELECTOR.SERIAL_BAUD_RATE_CODE] ?? 0,
          parity: raw[M70_DEVICE_INFO_SELECTOR.PARITY] ?? 0,
          stopBitCode: raw[M70_DEVICE_INFO_SELECTOR.STOP_BIT_CODE] ?? 0,
          dateSeparator: raw[M70_DEVICE_INFO_SELECTOR.DATE_SEPARATOR] ?? 0,
          verifyMode: raw[M70_DEVICE_INFO_SELECTOR.VERIFY_MODE] ?? 0,
          doorControlMode: raw[M70_DEVICE_INFO_SELECTOR.DOOR_CONTROL_MODE] ?? 0,
          doorSensorType: raw[M70_DEVICE_INFO_SELECTOR.DOOR_SENSOR_TYPE] ?? 0,
          doorOpenTimeout: raw[M70_DEVICE_INFO_SELECTOR.DOOR_OPEN_TIMEOUT] ?? 0,
          antiPassback: raw[M70_DEVICE_INFO_SELECTOR.ANTI_PASSBACK] ?? 0,
          autoSleep: raw[M70_DEVICE_INFO_SELECTOR.AUTO_SLEEP] ?? 0,
          daylightOffset: raw[M70_DEVICE_INFO_SELECTOR.DAYLIGHT_OFFSET] ?? 0,
          showRealtimeCamera:
            raw[M70_DEVICE_INFO_SELECTOR.SHOW_REALTIME_CAMERA] ?? 0,
          useFailLog: raw[M70_DEVICE_INFO_SELECTOR.USE_FAIL_LOG] ?? 0,
          raw,
        };
      }),
    );
  }

  async getDeviceIdentity(): Promise<TimeClockDeviceIdentity> {
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const serial = await session.requestData(
          M70_COMMAND.GET_SERIAL_NUMBER,
          32,
        );
        const backup = await session.requestResult(
          M70_COMMAND.GET_BACKUP_NUMBER,
        );
        const product = await session.requestData(
          M70_COMMAND.GET_PRODUCT_CODE,
          32,
        );

        return {
          serialNumber: decodeM70Text(serial.payload),
          backupNumber: backup.value,
          productCode: decodeM70Text(product.payload),
        };
      }),
    );
  }

  async getDeviceTime(): Promise<TimeClockDeviceTime> {
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const response = await session.requestData(
          M70_COMMAND.GET_DEVICE_TIME,
          4,
          0,
          4,
        );
        return decodeM70DeviceTime(response.payload);
      }),
    );
  }

  async listUsers(options: ListUsersOptions = {}): Promise<TimeClockUser[]> {
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const countResult = await session.requestResult(
          M70_COMMAND.READ_ALL_USER_IDS,
          0,
          0,
        );
        const count = countResult.value;
        if (count === 0) return [];
        if (count > 10000) {
          throw new TimeClockProtocolError(
            `M70 returned unreasonable user count ${count}`,
          );
        }

        // The M70 returns one 8-byte row per enrolled credential/template,
        // so the second response can contain more rows than userCount.
        const usersResult = await session.requestVariableData(
          M70_COMMAND.READ_ALL_USER_IDS,
          8,
          1,
          count,
        );
        const summary = decodeM70UserSummary(usersResult.payload);
        const usersById = new Map<number, TimeClockUser>();
        for (const user of summary) {
          if (!usersById.has(user.userId)) usersById.set(user.userId, user);
        }
        const users = [...usersById.values()];

        if (options.includeNames === false) return users;
        for (const user of users) {
          const response = await session.requestData(
            M70_COMMAND.GET_USER_NAME,
            48,
            0,
            user.userId,
          );
          user.name = decodeM70Text(response.payload);
        }
        return users;
      }),
    );
  }

  async getUserName(userId: number): Promise<string> {
    assertUserId(userId);
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const response = await session.requestData(
          M70_COMMAND.GET_USER_NAME,
          48,
          0,
          userId,
        );
        return decodeM70Text(response.payload);
      }),
    );
  }

  async setDeviceTime(_value: Date): Promise<void> {
    // The M70 read command is verified, but the write payload variant is not
    // yet verified against firmware 3.6.8. Do not guess a write frame.
    encodeM70DeviceTime(_value);
    throw new TimeClockUnsupportedError(
      'M70 setDeviceTime is not enabled until its firmware 3.6.8 write frame is verified',
    );
  }

  async setUserName(userId: number, name: string): Promise<void> {
    return this.upsertUser({ userId, name });
  }

  async upsertUser(user: TimeClockUserUpsert): Promise<void> {
    const prepared = prepareUserUpsert(user);

    return this.enqueue(() =>
      this.withSession(async (session) => {
        for (const fingerprint of prepared.fingerprints) {
          await session.requestWrite(
            M70_COMMAND.SET_ENROLL_DATA,
            fingerprint.commandArg2,
            fingerprint.commandArg3,
            fingerprint.payload,
          );
        }

        if (prepared.password) {
          await session.requestWrite(
            M70_COMMAND.SET_ENROLL_DATA,
            0x12,
            prepared.userId,
            prepared.password,
          );
        }

        if (prepared.cardId) {
          await session.requestWrite(
            M70_COMMAND.SET_ENROLL_DATA,
            0x13,
            prepared.userId,
            prepared.cardId,
          );
        }

        if (prepared.name !== undefined) {
          const result = await session.requestWrite(
            M70_COMMAND.SET_USER_NAME,
            0,
            prepared.userId,
            prepared.name,
          );
          if (result.word === 0)
            throw new TimeClockProtocolError(
              `M70 rejected name write: status=${result.status}, value=${result.value}`,
              M70_COMMAND.SET_USER_NAME,
            );
        }

        if (prepared.privilege !== undefined) {
          await session.requestResult(
            M70_COMMAND.MODIFY_PRIVILEGE,
            prepared.privilege,
            prepared.userId,
          );
        }

        if (prepared.enabled !== undefined) {
          await session.requestResult(
            M70_COMMAND.ENABLE_USER,
            prepared.enabled ? 1 : 0,
            prepared.userId,
          );
        }
      }),
    );
  }

  async deleteUser(userId: number): Promise<void> {
    assertUserId(userId);
    return this.enqueue(() =>
      this.withSession(async (session) => {
        // DeviceProperty.Enrolls with a user ID maps to the native
        // DeleteEnrollData "all credentials for one user" selector (5).
        await session.requestResult(M70_COMMAND.DELETE_ENROLL_DATA, 5, userId);
      }),
    );
  }

  async setUserEnabled(userId: number, enabled: boolean): Promise<void> {
    assertUserId(userId);
    void enabled;
    throw new TimeClockUnsupportedError(
      'M70 setUserEnabled is not enabled until its firmware 3.6.8 write frame is verified',
    );
  }

  async getAttendanceLogs(
    query: TimeClockAttendanceLogQuery = {},
  ): Promise<TimeClockAttendanceLog[]> {
    if (query.markAsRead) {
      throw new TimeClockUnsupportedError(
        'M70 attendance log read-mark mode is disabled',
      );
    }
    return this.enqueue(() =>
      this.withSession(async (session) => {
        const payload = await session.readAllAttendanceLogs();
        return decodeM70AttendanceLogs(payload)
          .map((row, index) => ({ ...row, index }))
          .filter(
            (row) =>
              (!query.startDate || row.clock >= query.startDate) &&
              (!query.endDate || row.clock <= query.endDate),
          );
      }),
    );
  }

  private async withSession<T>(
    callback: (session: M70Session) => Promise<T>,
  ): Promise<T> {
    const session = new M70Session(this.options);
    try {
      await session.open();
      return await callback(session);
    } finally {
      session.close();
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.operationQueue.then(operation, operation);
    this.operationQueue = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }
}

function resolveOptions(
  configService: ConfigService,
  moduleOptions: TimeClockModuleOptions,
): ResolvedTimeClockOptions {
  const options: ResolvedTimeClockOptions = {
    host:
      moduleOptions.host ??
      configService.get<string>('TIME_CLOCK_IP') ??
      DEFAULT_OPTIONS.host,
    port: readNumber(
      moduleOptions.port,
      configService.get<string>('TIME_CLOCK_PORT'),
      DEFAULT_OPTIONS.port,
    ),
    dn: readNumber(
      moduleOptions.dn,
      configService.get<string>('TIME_CLOCK_DN'),
      DEFAULT_OPTIONS.dn,
    ),
    password: readNumber(
      moduleOptions.password,
      configService.get<string>('TIME_CLOCK_PASSWORD'),
      DEFAULT_OPTIONS.password,
    ),
    timeoutMs: readNumber(
      moduleOptions.timeoutMs,
      configService.get<string>('TIME_CLOCK_TIMEOUT_MS'),
      DEFAULT_OPTIONS.timeoutMs,
    ),
  };

  if (!options.host.trim()) throw new Error('TIME_CLOCK_IP cannot be empty');
  if (
    !Number.isInteger(options.port) ||
    options.port < 1 ||
    options.port > 65535
  ) {
    throw new Error('TIME_CLOCK_PORT must be an integer between 1 and 65535');
  }
  if (!Number.isInteger(options.dn) || options.dn < 0 || options.dn > 65535) {
    throw new Error('TIME_CLOCK_DN must be an integer between 0 and 65535');
  }
  if (!Number.isInteger(options.password) || options.password < 0) {
    throw new Error('TIME_CLOCK_PASSWORD must be a non-negative integer');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 100) {
    throw new Error(
      'TIME_CLOCK_TIMEOUT_MS must be an integer of at least 100ms',
    );
  }

  return options;
}

function readNumber(
  override: number | undefined,
  environmentValue: string | undefined,
  fallback: number,
): number {
  if (override !== undefined) return override;
  if (environmentValue === undefined || environmentValue.trim() === '')
    return fallback;
  const value = Number(environmentValue);
  if (Number.isNaN(value)) return fallback;
  return value;
}

const M70_USER_NAME_WRITE_LENGTH = 0x6c;
const M70_FINGERPRINT_TEMPLATE_LENGTH = 0x588;

interface PreparedFingerprint {
  commandArg2: number;
  commandArg3: number;
  payload: Buffer;
}

interface PreparedUserUpsert {
  userId: number;
  name?: Buffer;
  enabled?: boolean;
  privilege?: number;
  password?: Buffer;
  cardId?: Buffer;
  fingerprints: PreparedFingerprint[];
}

function prepareUserUpsert(user: TimeClockUserUpsert): PreparedUserUpsert {
  if (!user || typeof user !== 'object') {
    throw new TimeClockProtocolError('M70 user upsert input is required');
  }

  assertUserId(user.userId);

  const fingerprints = user.fingerprints ?? [];
  if (!Array.isArray(fingerprints)) {
    throw new TimeClockProtocolError(
      'M70 user fingerprints must be an array when provided',
    );
  }

  const hasChange =
    user.name !== undefined ||
    user.enabled !== undefined ||
    user.privilege !== undefined ||
    user.password !== undefined ||
    user.cardId !== undefined ||
    fingerprints.length > 0;
  if (!hasChange) {
    throw new TimeClockProtocolError(
      'M70 user upsert must include at least one field to change',
    );
  }

  let name: Buffer | undefined;
  if (user.name !== undefined) {
    if (typeof user.name !== 'string') {
      throw new TimeClockProtocolError('M70 user name must be a string');
    }
    name = encodeM70Text(user.name, M70_USER_NAME_WRITE_LENGTH);
  }

  if (user.enabled !== undefined && typeof user.enabled !== 'boolean') {
    throw new TimeClockProtocolError('M70 user enabled must be a boolean');
  }

  if (
    user.privilege !== undefined &&
    (!Number.isInteger(user.privilege) ||
      user.privilege < 0 ||
      user.privilege > 0xffff)
  ) {
    throw new TimeClockProtocolError(
      'M70 user privilege must be an unsigned 16-bit integer',
    );
  }

  const seenFingerprintSlots = new Set<number>();
  const preparedFingerprints = fingerprints.map((fingerprint) => {
    if (!fingerprint || typeof fingerprint !== 'object') {
      throw new TimeClockProtocolError(
        'M70 fingerprint enrollment must be an object',
      );
    }
    if (
      !Number.isInteger(fingerprint.slot) ||
      fingerprint.slot < 0 ||
      fingerprint.slot > 9
    ) {
      throw new TimeClockProtocolError(
        'M70 fingerprint slot must be an integer between 0 and 9',
      );
    }
    if (seenFingerprintSlots.has(fingerprint.slot)) {
      throw new TimeClockProtocolError(
        `M70 fingerprint slot ${fingerprint.slot} was provided more than once`,
      );
    }
    seenFingerprintSlots.add(fingerprint.slot);

    if (fingerprint.duress) {
      throw new TimeClockUnsupportedError(
        'M70 duress fingerprint enrollment is not enabled',
      );
    }
    if (!Buffer.isBuffer(fingerprint.template)) {
      throw new TimeClockProtocolError(
        'M70 fingerprint template must be a Buffer',
      );
    }
    if (fingerprint.template.length !== M70_FINGERPRINT_TEMPLATE_LENGTH) {
      throw new TimeClockProtocolError(
        `M70 fingerprint template must be ${M70_FINGERPRINT_TEMPLATE_LENGTH} bytes in native format`,
      );
    }
    if (user.userId > 0x0fffffff) {
      throw new TimeClockProtocolError(
        'M70 fingerprint enrollment requires a userId no larger than 0x0fffffff',
      );
    }

    return {
      commandArg2: 0x11,
      commandArg3: ((fingerprint.slot << 28) | user.userId) >>> 0,
      payload: Buffer.from(fingerprint.template),
    };
  });

  return {
    userId: user.userId,
    name,
    enabled: user.enabled,
    privilege: user.privilege,
    password:
      user.password === undefined
        ? undefined
        : encodeM70NumericCredential(user.password, 'password'),
    cardId:
      user.cardId === undefined
        ? undefined
        : encodeM70NumericCredential(user.cardId, 'cardId'),
    fingerprints: preparedFingerprints,
  };
}

function encodeM70NumericCredential(
  value: string | number,
  fieldName: 'password' | 'cardId',
): Buffer {
  let numericValue: bigint;
  try {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('not an unsigned integer');
      }
      numericValue = BigInt(value);
    } else {
      if (!/^\d+$/.test(value.trim())) {
        throw new Error('not a decimal integer');
      }
      numericValue = BigInt(value.trim());
    }
  } catch {
    throw new TimeClockProtocolError(
      `M70 user ${fieldName} must be an unsigned 32-bit integer`,
    );
  }

  if (numericValue > 0xffffffffn) {
    throw new TimeClockProtocolError(
      `M70 user ${fieldName} must be an unsigned 32-bit integer`,
    );
  }

  const payload = Buffer.alloc(4);
  payload.writeUInt32LE(Number(numericValue), 0);
  return payload;
}

function assertUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId < 0 || userId > 0xffffffff) {
    throw new TimeClockProtocolError(
      'M70 userId must be an unsigned 32-bit integer',
    );
  }
}
