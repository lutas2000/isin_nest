import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendRecord } from './entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';
import { AttendRecordMapper } from './attend-record-mapper';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createReadStream } from 'fs';

/**
 * 出勤記錄 CSV 檔案讀取器
 * 將 Python Django 版本轉換為 NestJS TypeScript 版本
 */
@Injectable()
export class AttendRecordCsvReader {
  private readonly logger = new Logger(AttendRecordCsvReader.name);
  private readonly csvDirPath: string;

  constructor(
    @InjectRepository(AttendRecord)
    private readonly attendRecordRepository: Repository<AttendRecord>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly attendRecordMapper: AttendRecordMapper,
  ) {
    // 打卡記錄資料夾位置
    this.csvDirPath = path.join('files/attend/Log');
  }

  /**
   * 搜尋並處理所有出勤記錄檔案
   */
  async searchAttendLogs(): Promise<void> {
    try {
      const foundFiles: Array<{
        filePath: string;
        modificationTime: number;
      }> = [];

      // 遞迴搜尋所有 .txt 檔案
      await this.walkDirectory(this.csvDirPath, foundFiles);

      // 依修改時間排序（從舊到新）
      foundFiles.sort((a, b) => a.modificationTime - b.modificationTime);

      // 處理每個檔案
      for (const { filePath } of foundFiles) {
        const dirPath = path.dirname(filePath);
        const fileName = path.basename(filePath);

        // 複製檔案到備份資料夾
        await this.copyFile(dirPath, fileName);

        // 讀取並處理 CSV 檔案
        await this.readCsvFile(dirPath, fileName);

        // 刪除已處理的檔案
        await this.removeFile(dirPath, fileName);
      }
    } catch (error) {
      this.logger.error('搜尋出勤記錄檔案時發生錯誤', error);
      throw error;
    }
  }

  /**
   * 遞迴遍歷目錄尋找 .txt 檔案
   */
  private async walkDirectory(
    dirPath: string,
    foundFiles: Array<{ filePath: string; modificationTime: number }>,
  ): Promise<void> {
    try {
      // 檢查目錄是否存在
      if (!fs.existsSync(dirPath)) {
        this.logger.warn(`目錄不存在: ${dirPath}`);
        return;
      }

      const items = await fs.promises.readdir(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(fullPath);

        if (stats.isDirectory()) {
          // 遞迴處理子目錄
          await this.walkDirectory(fullPath, foundFiles);
        } else if (stats.isFile() && item.endsWith('.txt')) {
          // 找到 .txt 檔案
          foundFiles.push({
            filePath: fullPath,
            modificationTime: stats.mtime.getTime(),
          });
        }
      }
    } catch (error) {
      this.logger.warn(`遍歷目錄失敗: ${dirPath}`, error);
    }
  }

  /**
   * 讀取並處理 CSV 檔案
   */
  private async readCsvFile(
    dirPath: string,
    fileName: string,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const filePath = path.join(dirPath, fileName);
      const fileStream = createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let rowCount = 0;
      const processedRows: Promise<void>[] = [];

      rl.on('line', (line) => {
        rowCount++;
        const row = line.split(',').map((cell) => cell.trim());
        const promise = this.readRow(row, fileName, rowCount);
        processedRows.push(promise);
      });

      rl.on('close', () => {
        Promise.all(processedRows)
          .then(() => {
            this.logger.log(`成功讀取 CSV 檔案: ${fileName}`);
            resolve(true);
          })
          .catch((error) => {
            this.logger.error(`處理 CSV 檔案資料失敗: ${fileName}`, error);
            reject(new Error(`處理 CSV 檔案資料失敗: ${fileName}`));
          });
      });

      rl.on('error', (error) => {
        this.logger.error(`讀取 CSV 檔案失敗: ${fileName}`, error);
        reject(new Error(`讀取 CSV 檔案失敗: ${fileName}`));
      });
    });
  }

  /**
   * 處理單行 CSV 資料
   */
  private async readRow(
    row: string[],
    fileName: string,
    rowCount: number,
  ): Promise<void> {
    try {
      // 使用 AttendRecordMapper 將 CSV 資料轉換為實體
      const attendRecord = this.attendRecordMapper.csvToEntity(row);

      // 驗證記錄是否有效
      if (!this.attendRecordMapper.validateAttendRecord(attendRecord)) {
        this.logger.warn(`無效記錄: ${JSON.stringify(row)}`);
        return;
      }

      // 保存出勤記錄
      const savedRecord = await this.attendRecordRepository.save(attendRecord);
      const finalRecord = Array.isArray(savedRecord)
        ? (savedRecord[0] as AttendRecord)
        : savedRecord;

      this.logger.log(
        `成功保存出勤記錄: ${this.attendRecordMapper.formatForLogging(finalRecord)}`,
      );
    } catch (error) {
      this.logger.warn(
        `保存出勤記錄失敗 (檔案: ${fileName}, 行: ${rowCount})`,
        error,
      );
    }
  }

  /**
   * 刪除檔案
   */
  private async removeFile(dirPath: string, fileName: string): Promise<void> {
    try {
      const filePath = path.join(dirPath, fileName);
      await fs.promises.unlink(filePath);
      this.logger.log(`成功刪除檔案: ${fileName}`);
    } catch (error) {
      this.logger.warn(`刪除檔案失敗: ${fileName}`, error);
    }
  }

  /**
   * 複製檔案到備份目錄
   */
  private async copyFile(dirPath: string, fileName: string): Promise<void> {
    try {
      const fromPath = path.join(dirPath, fileName);
      const backupDir = path.join('files/attend/backup');
      const toPath = path.join(backupDir, fileName);

      // 確保備份目錄存在
      await this.ensureDirectoryExists(backupDir);

      await fs.promises.copyFile(fromPath, toPath);
      this.logger.log(`成功複製檔案到備份目錄: ${fileName}`);
    } catch (error) {
      this.logger.warn(`複製檔案失敗: ${fileName}`, error);
    }
  }

  /**
   * 移動檔案到備份目錄
   */
  private async moveFile(dirPath: string, fileName: string): Promise<void> {
    try {
      const fromPath = path.join(dirPath, fileName);
      const backupDir = path.join('files/attend/backup');
      const toPath = path.join(backupDir, fileName);

      // 確保備份目錄存在
      await this.ensureDirectoryExists(backupDir);

      await fs.promises.rename(fromPath, toPath);
      this.logger.log(`成功移動檔案到備份目錄: ${fileName}`);
    } catch (error) {
      this.logger.warn(`移動檔案失敗: ${fileName}`, error);
    }
  }

  /**
   * 確保目錄存在，如果不存在則建立
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  }
}

/**
 * 出勤記錄 USB CSV 讀取器
 */
@Injectable()
export class AttendRecordUsbReader {
  private readonly logger = new Logger(AttendRecordUsbReader.name);
  private readonly csvDirPath: string;
  private readonly fileName: string;

  constructor(
    @InjectRepository(AttendRecord)
    private readonly attendRecordRepository: Repository<AttendRecord>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly attendRecordMapper: AttendRecordMapper,
  ) {
    // 打卡記錄資料夾位置
    this.csvDirPath = path.join('files/attend');
    this.fileName = 'usb.csv';
  }

  /**
   * 讀取 USB CSV 檔案
   */
  async read(): Promise<void> {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.csvDirPath, this.fileName);

      // 檢查檔案是否存在
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`USB CSV 檔案不存在: ${filePath}`);
        resolve();
        return;
      }

      const fileStream = createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const processedRows: Promise<void>[] = [];

      rl.on('line', (line) => {
        // USB CSV 使用 tab 分隔符
        const row = line.split('\t').map((cell) => cell.trim());
        const promise = this.readRow(row);
        processedRows.push(promise);
      });

      rl.on('close', () => {
        Promise.all(processedRows)
          .then(() => {
            this.logger.log(`成功讀取 USB CSV 檔案: ${this.fileName}`);
            resolve();
          })
          .catch((error) => {
            this.logger.error(
              `處理 USB CSV 檔案資料失敗: ${this.fileName}`,
              error,
            );
            reject(new Error(`處理 USB CSV 檔案資料失敗: ${this.fileName}`));
          });
      });

      rl.on('error', (error) => {
        this.logger.error(`讀取 USB CSV 檔案失敗: ${this.fileName}`, error);
        reject(new Error(`讀取 USB CSV 檔案失敗: ${this.fileName}`));
      });
    });
  }

  /**
   * 處理單行 USB CSV 資料
   */
  private async readRow(row: string[]): Promise<void> {
    try {
      // 使用 AttendRecordMapper 將 USB CSV 資料轉換為實體
      const attendRecord = await this.attendRecordMapper.usbCsvToEntity(row);

      // 驗證記錄是否有效
      if (!this.attendRecordMapper.validateAttendRecord(attendRecord)) {
        this.logger.warn(`無效 USB 記錄: ${JSON.stringify(row)}`);
        return;
      }

      // 保存出勤記錄
      const savedRecord = await this.attendRecordRepository.save(attendRecord);
      const finalRecord = Array.isArray(savedRecord)
        ? (savedRecord[0] as AttendRecord)
        : savedRecord;

      this.logger.log(
        `成功保存 USB 出勤記錄: ${this.attendRecordMapper.formatForLogging(finalRecord)}`,
      );
    } catch (error) {
      this.logger.warn(`保存 USB 出勤記錄失敗`, error);
    }
  }
}
