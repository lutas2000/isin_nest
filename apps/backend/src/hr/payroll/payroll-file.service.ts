import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 薪資 xlsx 的檔案存取。目錄由 `PAYROLL_FILES_PATH` 指定（預設 `files/payroll`），
 * 底下再分 `{yyyy}/`。檔案只是 snapshot 的輸出格式，遺失時可從 snapshot 重建。
 */
@Injectable()
export class PayrollFileService {
  private readonly logger = new Logger(PayrollFileService.name);

  constructor(private readonly config: ConfigService) {}

  get baseDir(): string {
    return this.config.get<string>('PAYROLL_FILES_PATH') || path.join('files', 'payroll');
  }

  resolve(periodStart: string, fileName: string): string {
    return path.join(this.baseDir, periodStart.slice(0, 4), fileName);
  }

  async write(filePath: string, buffer: Buffer): Promise<{ filePath: string; fileSha256: string }> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    this.logger.log(`wrote ${filePath} (${buffer.length} bytes)`);
    return { filePath, fileSha256: sha256(buffer) };
  }

  /** 讀回檔案；不存在或內容與記錄的 sha256 不符時回 null，呼叫端重建。 */
  async read(filePath: string | null, expectedSha256: string | null): Promise<Buffer | null> {
    if (!filePath) return null;
    try {
      const buffer = await fs.promises.readFile(filePath);
      if (expectedSha256 && sha256(buffer) !== expectedSha256) {
        this.logger.warn(`${filePath} sha256 mismatch; rebuilding from snapshot`);
        return null;
      }
      return buffer;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
