import { EventEmitter } from 'node:events';
import { M70Session, RealandM70Client } from './realand-m70.client';
import {
  buildDataFrame,
  checksum16,
  decodeM70AttendanceLogs,
  parseDataFrame,
} from './realand-m70.protocol';

function resultFrame(value: number, word = 1): Buffer {
  const frame = Buffer.alloc(14);
  frame.writeUInt16BE(0xaa55, 0);
  frame.writeUInt16LE(3, 2);
  frame.writeUInt16LE(0, 4);
  frame.writeUInt16LE(word, 6);
  frame.writeUInt32LE(value, 8);
  frame.writeUInt16LE(checksum16(frame.subarray(0, 12)), 12);
  return frame;
}

class FakeSocket extends EventEmitter {
  readonly commands: Array<{ command: number; arg2: number; arg3: number }> = [];
  completions = 0;
  total = 541;
  cursor = 540;
  advanceCursor = true;
  error: Error | undefined;
  private awaitingMode = false;
  private requestedCount = 0;
  private awaitingCompletion = false;
  private transferEnd = 0;

  setTimeout(): this {
    return this;
  }

  connect(_port: number, _host: string, callback?: () => void): this {
    callback?.();
    return this;
  }

  write(chunk: Buffer, callback?: (error?: Error | null) => void): boolean {
    try {
      let response: Buffer;
      if (this.awaitingCompletion && chunk.readUInt16BE(0) === 0x5aa5) {
        const payload = parseDataFrame(chunk, 3, 4);
        expect(payload.readUInt32LE(0)).toBe(this.requestedCount);
        this.completions++;
        this.awaitingCompletion = false;
        if (this.advanceCursor) this.cursor = this.transferEnd;
        response = resultFrame(0);
      } else if (this.awaitingMode) {
        this.awaitingMode = false;
        if (chunk.readUInt16BE(0) !== 0x5aa5) {
          throw new Error('ReadGeneralLogData must send a 5AA5 cursor frame');
        }
        const startIndex = Buffer.alloc(4);
        startIndex.writeUInt32LE(this.cursor + 1);
        expect(parseDataFrame(chunk, 3, 4)).toEqual(startIndex);
        const countPayload = Buffer.alloc(8);
        countPayload.writeUInt32LE(this.requestedCount, 0);
        const row = Buffer.from('b4ce0032010000007980ffff', 'hex');
        this.transferEnd = this.cursor + this.requestedCount;
        this.awaitingCompletion = true;
        response = Buffer.concat([
          resultFrame(this.requestedCount),
          buildDataFrame(3, countPayload),
          buildDataFrame(3, row),
        ]);
      } else {
        const command = chunk.readUInt16LE(6);
        const arg3 = chunk.readUInt32LE(8);
        const arg2 = chunk.readUInt16LE(12);
        this.commands.push({ command, arg2, arg3 });
        const ack = Buffer.from('5aa5030001000301', 'hex');
        if (command === 0x0052) {
          response = Buffer.concat([ack, resultFrame(0)]);
        } else if (command === 0x0106) {
          const cursor = Buffer.alloc(4);
          cursor.writeUInt32LE(this.cursor, 0);
          response = Buffer.concat([ack, resultFrame(this.total), buildDataFrame(3, cursor)]);
        } else if (command === 0x0107 && arg2 === 1) {
          this.requestedCount = arg3;
          this.awaitingMode = true;
          response = ack;
        } else {
          throw new Error(`Unexpected command 0x${command.toString(16)}`);
        }
      }
      queueMicrotask(() => this.emit('data', response));
      callback?.();
      return true;
    } catch (error) {
      this.error = error as Error;
      queueMicrotask(() => this.emit('error', this.error));
      callback?.(this.error);
      return false;
    }
  }

  destroy(): this {
    return this;
  }
}

describe('RealandM70Client ReadGeneralLogData sequence', () => {
  it('reads only the unread batch without advancing the cursor when completion is omitted', async () => {
    const socket = new FakeSocket();
    const session = new M70Session(
      { host: '127.0.0.1', port: 5005, dn: 3, password: 0, timeoutMs: 1000 },
      () => socket as never,
    );

    try {
      await session.open();
      const payload = await session.readGeneralAttendanceLogs();
      expect(socket.error).toBeUndefined();
      expect(socket.commands).toEqual([
        { command: 0x0052, arg2: 1, arg3: 0 },
        { command: 0x0106, arg2: 0, arg3: 0 },
        { command: 0x0107, arg2: 1, arg3: 1 },
      ]);
      const logs = decodeM70AttendanceLogs(payload);
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('1');
      expect(logs[0].clock?.toISOString()).toBe('2026-08-01T15:35:16.000Z');
      expect(socket.completions).toBe(0);
      expect(socket.cursor).toBe(540);
    } finally {
      session.close();
    }
  });

  it('rejects full-history reads combined with marking unread logs', async () => {
    const client = new RealandM70Client(
      { get: () => undefined } as never,
      { host: '127.0.0.1', port: 5005, dn: 3, timeoutMs: 1000 },
    );
    await expect(client.getAttendanceLogs({ includeAll: true, markAsRead: true })).rejects.toThrow(
      'mutually exclusive',
    );
  });

  const consume = async (socket: FakeSocket, persist: (payload: Buffer) => Promise<unknown>) => {
    const session = new M70Session(
      { host: '127.0.0.1', port: 5005, dn: 3, password: 0, timeoutMs: 1000 },
      () => socket as never,
    );
    try { await session.open(); return await session.consumeGeneralAttendanceLogs(persist); }
    finally { session.close(); }
  };

  it('sends the final 5AA5 consumed count only after persistence completes and verifies the cursor', async () => {
    const socket = new FakeSocket();
    await expect(consume(socket, async (payload) => {
      expect(decodeM70AttendanceLogs(payload)).toHaveLength(1);
      expect(socket.completions).toBe(0);
      return 'committed';
    })).resolves.toBe('committed');
    expect(socket.completions).toBe(1);
    expect(socket.cursor).toBe(541);
    expect(socket.commands.filter((cmd) => cmd.command === 0x0106)).toHaveLength(2);
  });

  it('leaves the unread batch available when database persistence fails', async () => {
    const socket = new FakeSocket();
    await expect(consume(socket, async () => { throw new Error('rollback'); })).rejects.toThrow('rollback');
    expect(socket.completions).toBe(0);
    expect(socket.cursor).toBe(540);
  });

  it('reports a marker verification failure after a committed batch if the cursor did not advance', async () => {
    const socket = new FakeSocket();
    socket.advanceCursor = false;
    await expect(consume(socket, async () => 'committed')).rejects.toThrow('read cursor did not reach committed batch');
    expect(socket.completions).toBe(1);
    expect(socket.cursor).toBe(540);
  });

  it('does not mark a punch arriving while the batch is being committed', async () => {
    const socket = new FakeSocket();
    await consume(socket, async () => { socket.total++; });
    expect(socket.cursor).toBe(541);
    expect(socket.total - socket.cursor).toBe(1);
  });

  it('retries the persistence backlog on an empty device batch without sending completion', async () => {
    const socket = new FakeSocket();
    socket.cursor = socket.total;
    const persist = jest.fn().mockResolvedValue('backlog committed');
    await expect(consume(socket, persist)).resolves.toBe('backlog committed');
    expect(persist).toHaveBeenCalledWith(Buffer.alloc(0));
    expect(socket.completions).toBe(0);
    expect(socket.commands.some((cmd) => cmd.command === 0x0107)).toBe(false);
  });
});
