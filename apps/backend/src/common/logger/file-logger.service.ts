import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logDir: string;
  private readonly errorLogFile: string;
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly maxFiles: number = 5; // 保留最多 5 個檔案

  constructor() {
    // 設定日誌目錄（相對於專案根目錄）
    this.logDir = path.join(process.cwd(), 'logs');
    this.errorLogFile = path.join(this.logDir, 'error.log');

    // 確保日誌目錄存在
    this.ensureLogDirectory();
  }

  /**
   * 確保日誌目錄存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 執行日誌輪轉
   */
  private rotateLogFile(): void {
    try {
      if (!fs.existsSync(this.errorLogFile)) {
        return;
      }

      const stats = fs.statSync(this.errorLogFile);
      if (stats.size >= this.maxFileSize) {
        // 輪轉現有檔案
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const oldFile = `${this.errorLogFile}.${i}`;
          const newFile = `${this.errorLogFile}.${i + 1}`;
          if (fs.existsSync(oldFile)) {
            if (i + 1 > this.maxFiles) {
              fs.unlinkSync(oldFile);
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        // 將當前檔案移動為 .1
        fs.renameSync(this.errorLogFile, `${this.errorLogFile}.1`);
      }
    } catch (error) {
      // 如果輪轉失敗，繼續寫入原檔案
      console.error('日誌輪轉失敗:', error);
    }
  }

  /**
   * 格式化時間戳記
   */
  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  /**
   * 寫入錯誤到檔案
   */
  private writeToFile(level: string, message: string, context?: string, trace?: string): void {
    try {
      this.rotateLogFile();

      const timestamp = this.formatTimestamp();
      const contextStr = context ? `[${context}]` : '';
      const logEntry = `${timestamp} [${level}] ${contextStr} ${message}\n`;

      fs.appendFileSync(this.errorLogFile, logEntry, { encoding: 'utf8' });

      // 如果有堆疊追蹤，也寫入（每行前加上縮排）
      if (trace) {
        const traceLines = trace.split('\n');
        traceLines.forEach((line) => {
          if (line.trim()) {
            const traceEntry = `${' '.repeat(23)} ${line}\n`;
            fs.appendFileSync(this.errorLogFile, traceEntry, { encoding: 'utf8' });
          }
        });
      }
    } catch (error) {
      // 如果寫入檔案失敗，至少輸出到控制台
      console.error('寫入日誌檔案失敗:', error);
      console.error('原始錯誤:', message);
    }
  }

  /**
   * 記錄錯誤
   */
  error(message: string, trace?: string, context?: string): void {
    this.writeToFile('ERROR', message, context, trace);
    // 同時輸出到控制台
    console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`, trace || '');
  }

  /**
   * 記錄警告
   */
  warn(message: string, context?: string): void {
    this.writeToFile('WARN', message, context);
    console.warn(`[WARN] ${context ? `[${context}] ` : ''}${message}`);
  }

  /**
   * 記錄一般訊息
   */
  log(message: string, context?: string): void {
    // 一般訊息不寫入檔案，只輸出到控制台
    console.log(`[LOG] ${context ? `[${context}] ` : ''}${message}`);
  }

  /**
   * 記錄除錯訊息
   */
  debug(message: string, context?: string): void {
    // 除錯訊息不寫入檔案，只輸出到控制台
    console.debug(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`);
  }

  /**
   * 記錄詳細訊息
   */
  verbose(message: string, context?: string): void {
    // 詳細訊息不寫入檔案，只輸出到控制台
    console.log(`[VERBOSE] ${context ? `[${context}] ` : ''}${message}`);
  }
}

