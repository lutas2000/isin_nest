import {
  LegacyFileService,
  LegacyFileStat,
  LegacyFileSystem,
  LegacyFileTimeoutError,
} from './legacy-file.service';

const fileStat = (size = 10): LegacyFileStat => ({ isFile: () => true, size });

/** 每次呼叫都要手動放行的假檔案系統，用來觀察同時執行數與逾時。 */
function gatedFs() {
  const pending: {
    path: string;
    release: (value?: LegacyFileStat | Error) => void;
  }[] = [];
  let running = 0;
  let maxRunning = 0;
  const fs: LegacyFileSystem = {
    stat: (path) =>
      new Promise((resolve, reject) => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        pending.push({
          path,
          release: (value) => {
            running -= 1;
            if (value instanceof Error) reject(value);
            else resolve(value ?? fileStat());
          },
        });
      }),
    readFile: async () => 'text',
  };
  return { fs, pending, max: () => maxRunning };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('LegacyFileService', () => {
  it('runs at most four operations at once', async () => {
    const gate = gatedFs();
    const files = new LegacyFileService(gate.fs, { timeoutMs: 1000 });
    const results = Array.from({ length: 10 }, (_, index) =>
      files.exists(`/f${index}`),
    );
    await tick();
    expect(gate.pending).toHaveLength(4);
    expect(files.queuedCount).toBe(6);
    while (gate.pending.length) {
      gate.pending.shift()?.release();
      await tick();
    }
    await expect(Promise.all(results)).resolves.toEqual(Array(10).fill(true));
    expect(gate.max()).toBe(4);
    expect(files.activeCount).toBe(0);
  });

  it('times an operation out after the limit and never reports it as present or missing', async () => {
    const gate = gatedFs();
    const files = new LegacyFileService(gate.fs, { timeoutMs: 30 });
    const started = Date.now();
    await expect(files.exists('/slow')).rejects.toBeInstanceOf(
      LegacyFileTimeoutError,
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
    // 卡住的 stat 仍占名額，直到它真的結束。
    expect(files.activeCount).toBe(1);
    gate.pending[0].release();
    await tick();
    expect(files.activeCount).toBe(0);
  });

  it('rejects queued operations when the share makes no progress, instead of waiting forever', async () => {
    const gate = gatedFs();
    const files = new LegacyFileService(gate.fs, { timeoutMs: 40 });
    const results = Array.from({ length: 6 }, (_, index) =>
      files.exists(`/hung${index}`).catch((error) => error),
    );
    const settled = await Promise.all(results);
    expect(
      settled.every((value) => value instanceof LegacyFileTimeoutError),
    ).toBe(true);
    // 只有前 4 個真的開始；排隊的 2 個沒有碰檔案系統。
    expect(gate.pending).toHaveLength(4);
    expect(files.queuedCount).toBe(0);
    // 新的請求在名額仍被卡住時同樣逾時。
    await expect(files.exists('/later')).rejects.toBeInstanceOf(
      LegacyFileTimeoutError,
    );
    for (const call of gate.pending) call.release();
  });

  it('keeps queued operations waiting while slow operations still complete', async () => {
    const fs: LegacyFileSystem = {
      stat: () => sleep(15).then(() => fileStat()),
      readFile: async () => '',
    };
    const files = new LegacyFileService(fs, { timeoutMs: 40 });
    // 12 個各 15ms，4 個並行約 45ms，超過單一逾時，但一直有進展所以都成功。
    await expect(
      Promise.all(
        Array.from({ length: 12 }, (_, index) => files.exists(`/f${index}`)),
      ),
    ).resolves.toEqual(Array(12).fill(true));
  });

  it('drops queued operations of an aborted request', async () => {
    const gate = gatedFs();
    const files = new LegacyFileService(gate.fs, { timeoutMs: 1000 });
    const request = new AbortController();
    const results = Array.from({ length: 6 }, (_, index) =>
      files.exists(`/f${index}`, request.signal).catch((error) => error),
    );
    await tick();
    request.abort(new LegacyFileTimeoutError());
    for (const call of gate.pending) call.release();
    const settled = await Promise.all(results);
    expect(settled.slice(0, 4)).toEqual([true, true, true, true]);
    expect(
      settled
        .slice(4)
        .every((value) => value instanceof LegacyFileTimeoutError),
    ).toBe(true);
    expect(gate.pending).toHaveLength(4);
  });

  it('treats any fs error as missing, like existsSync, and reads only small regular files', async () => {
    const fs: LegacyFileSystem = {
      stat: async (path) => {
        if (path === '/missing')
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        if (path === '/dir') return { isFile: () => false, size: 0 };
        if (path === '/big') return fileStat(100);
        return fileStat(5);
      },
      readFile: async (path, options) => `${path}:${options.encoding}`,
    };
    const files = new LegacyFileService(fs);
    await expect(files.exists('/missing')).resolves.toBe(false);
    await expect(files.exists('/dir')).resolves.toBe(true);
    await expect(files.readSmallFile('/missing', 10)).resolves.toBeNull();
    await expect(files.readSmallFile('/dir', 10)).resolves.toBeNull();
    await expect(files.readSmallFile('/big', 10)).resolves.toBeNull();
    await expect(files.readSmallFile('/ok', 10)).resolves.toBe('/ok:latin1');
  });

  it('aborts a hanging read when it times out', async () => {
    let aborted = false;
    const fs: LegacyFileSystem = {
      stat: async () => fileStat(),
      readFile: (_path, options) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('AbortError'));
          });
        }),
    };
    const files = new LegacyFileService(fs, { timeoutMs: 20 });
    await expect(files.readSmallFile('/f', 100)).rejects.toBeInstanceOf(
      LegacyFileTimeoutError,
    );
    expect(aborted).toBe(true);
    await tick();
    expect(files.activeCount).toBe(0);
  });
});
