import {
  buildBigDataFrame,
  buildCommandFrame,
  checksum16,
  decodeM70DeviceTime,
  decodeM70AttendanceLogs,
  decodeM70Text,
  decodeM70UserSummary,
  encodeM70Text,
  parseAckFrame,
  parseDataFrame,
  parseResultFrame,
} from './realand-m70.protocol';

describe('Realand M70 protocol helpers', () => {
  it('builds the verified little-endian command frame', () => {
    const frame = buildCommandFrame(3, 0x0052, 1, 0);

    expect(frame.length).toBe(16);
    expect(frame.subarray(0, 14).toString('hex')).toBe(
      '55aa030079195200000000000100',
    );
    expect(frame.readUInt16LE(14)).toBe(checksum16(frame.subarray(0, 14)));
  });

  it('parses the verified ACK frame and validates its checksum', () => {
    const frame = Buffer.from('5aa5030001000301', 'hex');
    const ack = parseAckFrame(frame, 3);

    expect(ack.dn).toBe(3);
    expect(ack.resultWord).toBe(1);
  });

  it('decodes ASCII device serial without treating byte pairs as Chinese', () => {
    const serial = Buffer.alloc(32);
    serial.write('ZXTI06103026', 'ascii');
    expect(decodeM70Text(serial)).toBe('ZXTI06103026');
  });

  it('parses a result frame and exposes the raw frame', () => {
    const frame = Buffer.alloc(14);
    frame.writeUInt16BE(0xaa55, 0);
    frame.writeUInt16LE(3, 2);
    frame.writeUInt16LE(0, 4);
    frame.writeUInt16LE(2, 6);
    frame.writeUInt32LE(22, 8);
    frame.writeUInt16LE(checksum16(frame.subarray(0, 12)), 12);

    const result = parseResultFrame(frame, 3, 0x0108);

    expect(result.word).toBe(2);
    expect(result.value).toBe(22);
    expect(result.raw).not.toBe(frame);
  });

  it('parses a data frame and rejects invalid checksums', () => {
    const frame = Buffer.alloc(10);
    frame.writeUInt16BE(0xa55a, 0);
    frame.writeUInt16LE(3, 2);
    Buffer.from([1, 2, 3, 4]).copy(frame, 4);
    frame.writeUInt16LE(checksum16(frame.subarray(0, 8)), 8);

    expect(parseDataFrame(frame, 3, 4)).toEqual(Buffer.from([1, 2, 3, 4]));

    frame[4] = 9;
    expect(() => parseDataFrame(frame, 3, 4)).toThrow('checksum mismatch');
  });

  it('builds the big-data frame used by native write helpers', () => {
    const frame = buildBigDataFrame(3, Buffer.from([1, 2, 3]));

    expect(frame.subarray(0, 4).toString('hex')).toBe('5aa50300');
    expect(frame.subarray(4, 7)).toEqual(Buffer.from([1, 2, 3]));
    expect(frame.readUInt16LE(7)).toBe(checksum16(frame.subarray(0, 7)));
  });

  it('decodes device seconds from the 2000 epoch', () => {
    const seconds = Math.floor(
      (Date.UTC(2026, 8, 10, 12, 34, 56) - Date.UTC(2000, 0, 1)) / 1000,
    );
    const payload = Buffer.alloc(4);
    payload.writeUInt32LE(seconds, 0);

    const value = decodeM70DeviceTime(payload);

    expect(value.year).toBe(2026);
    expect(value.month).toBe(9);
    expect(value.day).toBe(10);
    expect(value.hour).toBe(12);
    expect(value.minute).toBe(34);
    expect(value.second).toBe(56);
    expect(value.rawSeconds).toBe(seconds);
  });

  it('round-trips the fixed-width UTF-16LE text field', () => {
    const encoded = encodeM70Text('王小明');
    expect(encoded.length).toBe(48);
    expect(decodeM70Text(encoded)).toBe('王小明');
  });

  it('decodes eight-byte user summary records while preserving raw bytes', () => {
    const payload = Buffer.alloc(16);
    payload.writeUInt32LE(1001, 0);
    payload.writeUInt32LE(1002, 8);

    const users = decodeM70UserSummary(payload);

    expect(users.map((user) => user.userId)).toEqual([1001, 1002]);
    expect(users[0].raw).toEqual(payload.subarray(0, 8));
  });

  it('decodes captured M70 attendance row layout without shifting wall time', () => {
    const row = Buffer.from('b4ce0032010000007980ffff', 'hex');
    const logs = decodeM70AttendanceLogs(row);
    expect(logs).toHaveLength(1);
    expect(logs[0].userId).toBe('1');
    expect(logs[0].clock.toISOString()).toBe('2026-08-01T15:35:16.000Z');
    expect(logs[0].verifyMode).toBe(0x79);
    expect(logs[0].raw).toEqual(row);
    expect(() => decodeM70AttendanceLogs(row.subarray(0, 11))).toThrow();
  });
});
