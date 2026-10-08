import { Inject, Injectable, Optional } from '@nestjs/common';
import { promises as fsPromises } from 'fs';

/**
 * 舊版圖檔、CNC 檔放在 SMB 掛載的資料夾；網路芳鄰沒有回應時，fs 呼叫可能卡住很久，
 * 並占住 libuv 的執行緒（預設 4 條，fs、dns、crypto 共用）。所有對這些資料夾的存取都經過這裡：
 *
 * - 同時最多 4 個操作；
 * - 每個操作 3 秒逾時（從開始執行算）。逾時後呼叫端立即收到 LegacyFileTimeoutError，
 *   但底層的 fs 呼叫若無法中止（stat 不能中止），它占的名額要等它真的結束才釋放，
 *   避免卡住的呼叫越積越多；
 * - 排隊中的操作若 3 秒內沒有任何操作完成（資料夾沒有回應），一律以逾時拒絕，不會無限等待；
 * - 呼叫端可傳 AbortSignal，中止後排隊中的操作直接拒絕（例如同一請求已有操作逾時）。
 */

export class LegacyFileTimeoutError extends Error {
  constructor(message = '檔案伺服器無回應') {
    super(message);
    this.name = 'LegacyFileTimeoutError';
  }
}

export interface LegacyFileStat {
  isFile(): boolean;
  size: number;
}

/** 可替換的檔案系統（測試注入慢速或卡住的實作）。 */
export interface LegacyFileSystem {
  stat(path: string): Promise<LegacyFileStat>;
  readFile(
    path: string,
    options: { encoding: 'latin1'; signal?: AbortSignal },
  ): Promise<string>;
}

export interface LegacyFileLimits {
  concurrency: number;
  timeoutMs: number;
}

export const LEGACY_FILE_SYSTEM = Symbol('LEGACY_FILE_SYSTEM');
export const LEGACY_FILE_LIMITS = Symbol('LEGACY_FILE_LIMITS');
export const DEFAULT_LEGACY_FILE_LIMITS: LegacyFileLimits = {
  concurrency: 4,
  timeoutMs: 3000,
};

const nodeFileSystem: LegacyFileSystem = {
  stat: (path) => fsPromises.stat(path),
  readFile: (path, options) => fsPromises.readFile(path, options),
};

interface Waiting {
  start: () => void;
  fail: (error: Error) => void;
}

@Injectable()
export class LegacyFileService {
  private readonly fs: LegacyFileSystem;
  readonly limits: LegacyFileLimits;
  private active = 0;
  private readonly queue: Waiting[] = [];
  private lastProgress = 0;
  private watchdog: NodeJS.Timeout | null = null;

  constructor(
    @Optional() @Inject(LEGACY_FILE_SYSTEM) fileSystem?: LegacyFileSystem,
    @Optional() @Inject(LEGACY_FILE_LIMITS) limits?: Partial<LegacyFileLimits>,
  ) {
    this.fs = fileSystem ?? nodeFileSystem;
    this.limits = { ...DEFAULT_LEGACY_FILE_LIMITS, ...(limits ?? {}) };
  }

  /** 目前執行中（含已逾時但底層尚未結束）的操作數。 */
  get activeCount(): number {
    return this.active;
  }

  get queuedCount(): number {
    return this.queue.length;
  }

  /** 檔案或資料夾是否存在（同 existsSync：任何錯誤視為不存在）；逾時丟 LegacyFileTimeoutError。 */
  async exists(path: string, signal?: AbortSignal): Promise<boolean> {
    return this.run(
      () =>
        this.fs.stat(path).then(
          () => true,
          () => false,
        ),
      signal,
    );
  }

  /**
   * 讀取不超過 maxBytes 的一般檔案（latin1）；不存在、不是檔案、過大或讀取錯誤時回傳 null。
   * stat 與讀取各算一個操作；逾時丟 LegacyFileTimeoutError。
   */
  async readSmallFile(
    path: string,
    maxBytes: number,
    signal?: AbortSignal,
  ): Promise<string | null> {
    const info = await this.run(
      () => this.fs.stat(path).catch(() => null),
      signal,
    );
    if (!info || !info.isFile() || info.size > maxBytes) return null;
    return this.run(
      (operationSignal) =>
        this.fs
          .readFile(path, { encoding: 'latin1', signal: operationSignal })
          .catch(() => null),
      signal,
    );
  }

  /** 以名額與逾時執行一個檔案操作。 */
  run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    return new Promise<T>((resolvePromise, rejectPromise) => {
      if (signal?.aborted) {
        rejectPromise(abortReason(signal));
        return;
      }
      let settled = false;
      const settle = (action: () => void) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', onAbort);
        action();
      };
      const waiting: Waiting = {
        start: () => {
          this.active += 1;
          const controller = new AbortController();
          const timer = setTimeout(() => {
            controller.abort();
            settle(() => rejectPromise(new LegacyFileTimeoutError()));
          }, this.limits.timeoutMs);
          timer.unref?.();
          Promise.resolve()
            .then(() => operation(controller.signal))
            .then(
              (value) => settle(() => resolvePromise(value)),
              (error: unknown) => settle(() => rejectPromise(error)),
            )
            .finally(() => {
              clearTimeout(timer);
              this.active -= 1;
              this.lastProgress = Date.now();
              this.next();
            });
        },
        fail: (error) => settle(() => rejectPromise(error)),
      };
      const onAbort = () => {
        const index = this.queue.indexOf(waiting);
        if (index >= 0) {
          this.queue.splice(index, 1);
          waiting.fail(abortReason(signal as AbortSignal));
        }
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      if (this.active < this.limits.concurrency) {
        waiting.start();
      } else {
        if (!this.queue.length) this.lastProgress = Date.now();
        this.queue.push(waiting);
        this.armWatchdog();
      }
    });
  }

  private next() {
    while (this.active < this.limits.concurrency && this.queue.length) {
      (this.queue.shift() as Waiting).start();
    }
    if (!this.queue.length && this.watchdog) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
  }

  /** 排隊中的操作：最近一次有操作完成（或開始排隊）後 timeoutMs 內仍沒有進展，全部以逾時拒絕。 */
  private armWatchdog() {
    if (this.watchdog) return;
    const check = () => {
      this.watchdog = null;
      if (!this.queue.length) return;
      const idle = Date.now() - this.lastProgress;
      if (idle >= this.limits.timeoutMs) {
        for (const waiting of this.queue.splice(0))
          waiting.fail(new LegacyFileTimeoutError());
        return;
      }
      this.watchdog = setTimeout(check, this.limits.timeoutMs - idle);
      this.watchdog.unref?.();
    };
    this.watchdog = setTimeout(
      check,
      Math.max(0, this.lastProgress + this.limits.timeoutMs - Date.now()),
    );
    this.watchdog.unref?.();
  }
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new LegacyFileTimeoutError();
}
