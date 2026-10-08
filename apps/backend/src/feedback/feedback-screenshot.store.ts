import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/** 截圖上限 5 MB（LEGACY-CRM-REBUILD-PLAN.md 7.2）。 */
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const STORED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;

/** 檔頭是不是 PNG（不信任瀏覽器送的 Content-Type）。 */
export function isPng(buffer: Buffer): boolean {
  return (
    buffer.length > PNG_SIGNATURE.length &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  );
}

/**
 * 回報截圖的檔案存取。目錄由 `FEEDBACK_UPLOAD_DIR` 指定（預設 `files/feedback`），檔名一律是 uuid.png，
 * 不放在靜態目錄，只能經 `GET /feedback/:id/screenshot`（admin）讀取。沒有保留期限。
 */
@Injectable()
export class FeedbackScreenshotStore {
  constructor(private readonly config: ConfigService) {}

  get baseDir(): string {
    return path.resolve(
      this.config.get<string>('FEEDBACK_UPLOAD_DIR') ||
        path.join('files', 'feedback'),
    );
  }

  /** 寫入並回傳存進資料庫的檔名。 */
  async save(buffer: Buffer): Promise<string> {
    const name = `${randomUUID()}.png`;
    await fs.promises.mkdir(this.baseDir, { recursive: true });
    await fs.promises.writeFile(path.join(this.baseDir, name), buffer, {
      flag: 'wx',
      mode: 0o640,
    });
    return name;
  }

  /** 資料庫裡的檔名 → 絕對路徑；檔名不是 uuid.png 一律拒絕，避免路徑穿越。 */
  resolve(name: string): string | null {
    return STORED_NAME.test(name) ? path.join(this.baseDir, name) : null;
  }

  async remove(name: string): Promise<void> {
    const file = this.resolve(name);
    if (file) await fs.promises.rm(file, { force: true });
  }
}
