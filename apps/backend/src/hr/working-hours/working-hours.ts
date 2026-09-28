import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendRecord } from '../attend-record/entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';

// 必須與 Django staff/models.py 保持一致。
export const TYPE_NEW = 0; // 新匯入、尚未判定
export const TYPE_ON_WORK = 1; // 上班
export const TYPE_OFF_WORK = 2; // 下班
export const TYPE_UNKNOWN = 3; // 奇數筆打卡中被保留的不明記錄

/**
 * 工作時間計算器
 * 對應原始 Python 中的 WorkingHours 類別。
 */
@Injectable()
export class WorkingHours {
  private readonly logger = new Logger(WorkingHours.name);

  constructor(
    @InjectRepository(AttendRecord)
    private readonly attendRecordRepository: Repository<AttendRecord>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  /**
   * 決定所有新匯入打卡紀錄的上／下班類型。
   * 奇數筆時保留倒數第二筆為 TYPE_UNKNOWN，讓下一次匯入有機會重新配對。
   */
  async appointAttendRecordsType(): Promise<Date | null> {
    try {
      const attendRecords = await this.findUndecidedRecords();
      const processedWorkDays = new Set<string>();

      for (const attendRecord of attendRecords) {
        if (!attendRecord) continue;

        const workDay = this.getWorkDayKey(attendRecord.createTime);
        const groupKey = `${attendRecord.staffId}:${workDay}`;
        if (processedWorkDays.has(groupKey)) continue;
        processedWorkDays.add(groupKey);

        const workRecords = await this.findUserRecords(attendRecord);
        await this.deleteUnknownRecord(workRecords);
        await this.appointAttendRecordType(workRecords);
      }

      return attendRecords[0]?.createTime || null;
    } catch (error) {
      this.logger.error('決定打卡記錄類型失敗', error);
      throw error;
    }
  }

  /** 對外提供給排程器使用的語意化別名。 */
  async appointAttendanceTypes(): Promise<Date | null> {
    return this.appointAttendRecordsType();
  }

  /** 尋找尚未判定的打卡紀錄。 */
  async findUndecidedRecords(): Promise<AttendRecord[]> {
    return this.attendRecordRepository.find({
      where: { attendType: TYPE_NEW } as any,
      order: { createTime: 'ASC' } as any,
    });
  }

  /**
   * 奇數筆打卡時，把倒數第二筆標為 UNKNOWN 並從本次配對移除。
   * 不刪除原始記錄，避免遺失設備資料。
   */
  async deleteUnknownRecord(workRecords: AttendRecord[]): Promise<void> {
    const size = workRecords.length;
    if (size > 1 && size % 2 !== 0) {
      const unknownRecord = workRecords[workRecords.length - 2];
      await this.updateAttendRecord(unknownRecord, TYPE_UNKNOWN);
      workRecords.splice(workRecords.length - 2, 1);

      this.logger.log(
        `保留不明打卡記錄: ${unknownRecord.staffId}, 時間: ${unknownRecord.createTime}`,
      );
    }
  }

  /** 依時間順序交替標記上班／下班。 */
  async appointAttendRecordType(workRecords: AttendRecord[]): Promise<void> {
    for (let index = 0; index < workRecords.length; index++) {
      const record = workRecords[index];
      const attendType = index % 2 === 0 ? TYPE_ON_WORK : TYPE_OFF_WORK;

      await this.updateAttendRecord(record, attendType);

      const typeText = attendType === TYPE_ON_WORK ? '上班' : '下班';
      this.logger.log(
        `設定打卡記錄類型: ${record.staffId}, ${typeText}, 時間: ${record.createTime}`,
      );
    }
  }

  /** 以打卡記錄上的 canonical staff ID 查詢工作日資料。 */
  async findUserRecords(attendRecord: AttendRecord): Promise<AttendRecord[]> {
    return this.findUserRecords1(
      attendRecord.staffId || attendRecord.staffName || '',
      attendRecord.createTime,
    );
  }

  /**
   * 尋找員工工作日內的所有打卡記錄。
   * 參數可接受 ID 或姓名；若傳姓名，會先解析為 staff.id。
   */
  async findUserRecords1(
    staffIdentifier: string,
    time: Date,
  ): Promise<AttendRecord[]> {
    const staffId = await this.resolveStaffId(staffIdentifier);
    const { start, end } = this.getWorkDayRange(time);

    const workRecords = await this.attendRecordRepository
      .createQueryBuilder('ar')
      .where('ar.createTime >= :startTime', { startTime: start })
      .andWhere('ar.createTime < :endTime', { endTime: end })
      .andWhere('ar.staffId = :staffId', { staffId })
      .orderBy('ar.createTime', 'ASC')
      .getMany();

    this.logger.debug(
      `查詢員工打卡記錄: ${staffId}, 時間範圍: ${String(start)} - ${String(end)}, 記錄數: ${workRecords.length}`,
    );
    return workRecords;
  }

  /** 以員工 ID 查詢工作日內的指定類型打卡記錄。 */
  async findUserRecords2(
    staffIdentifier: string,
    time: Date,
    attendType: number,
  ): Promise<AttendRecord[]> {
    const staffId = await this.resolveStaffId(staffIdentifier);
    const { start, end } = this.getWorkDayRange(time);

    const workRecords = await this.attendRecordRepository
      .createQueryBuilder('ar')
      .where('ar.createTime >= :startTime', { startTime: start })
      .andWhere('ar.createTime < :endTime', { endTime: end })
      .andWhere('ar.staffId = :staffId', { staffId })
      .andWhere('ar.attendType = :attendType', { attendType })
      .orderBy('ar.createTime', 'ASC')
      .getMany();

    this.logger.debug(
      `查詢員工特定類型打卡記錄: ${staffId}, 類型: ${attendType}, 記錄數: ${workRecords.length}`,
    );
    return workRecords;
  }

  /** 清楚表達呼叫端使用員工 ID 的別名。 */
  findUserRecordsByStaffId(
    staffId: string,
    time: Date,
  ): Promise<AttendRecord[]> {
    return this.findUserRecords1(staffId, time);
  }

  async updateAttendRecord(
    record: AttendRecord,
    attendType: number,
  ): Promise<void> {
    if (
      ![TYPE_NEW, TYPE_ON_WORK, TYPE_OFF_WORK, TYPE_UNKNOWN].includes(
        attendType,
      )
    ) {
      throw new Error(`無效的出勤類型: ${attendType}`);
    }

    record.attendType = attendType;
    await this.attendRecordRepository.save(record);
  }

  getCompanyStartWorkTime(): number {
    return 5;
  }

  async isStaffNeedCheck(staffIdentifier: string): Promise<boolean> {
    try {
      const staff = await this.findStaff(staffIdentifier);
      return staff?.need_check || false;
    } catch (error) {
      this.logger.warn(`檢查員工打卡需求失敗: ${staffIdentifier}`, error);
      return false;
    }
  }

  private async resolveStaffId(staffIdentifier: string): Promise<string> {
    if (!staffIdentifier) return staffIdentifier;

    const staff = await this.findStaff(staffIdentifier);
    return staff?.id || staffIdentifier;
  }

  private async findStaff(staffIdentifier: string): Promise<Staff | null> {
    const repository = this.staffRepository as Repository<Staff> & {
      findOne?: Repository<Staff>['findOne'];
    };
    if (typeof repository.findOne !== 'function' || !staffIdentifier) {
      return null;
    }

    const byId = await repository.findOne({
      where: { id: staffIdentifier },
    });
    if (byId) return byId;

    return repository.findOne({
      where: { name: staffIdentifier } as any,
    });
  }

  private getWorkDayRange(time: Date): { start: Date; end: Date } {
    const workDay = new Date(time);
    if (workDay.getUTCHours() < this.getCompanyStartWorkTime()) {
      workDay.setUTCDate(workDay.getUTCDate() - 1);
    }

    const start = new Date(workDay);
    start.setUTCHours(this.getCompanyStartWorkTime(), 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private getWorkDayKey(time: Date): string {
    const { start } = this.getWorkDayRange(time);
    return start.toISOString().split('T')[0];
  }
}
