import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendRecord } from '../attend-record/entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';

// 出勤類型常數
export const TYPE_ON_WORK = 1; // 上班
export const TYPE_OFF_WORK = 2; // 下班
export const TYPE_UNKNOWN = 0; // 未決定

/**
 * 工作時間計算器
 * 對應原始 Python 中的 WorkingHours 類別
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
   * 決定所有未決定打卡紀錄的類型(上/下班)
   * 對應原始 Python 中的 appoint_attend_records_type 方法
   */
  async appointAttendRecordsType(): Promise<Date | null> {
    try {
      const attendRecords = await this.findUndecidedRecords();

      if (attendRecords.length === 0) {
        this.logger.log('沒有未決定的打卡記錄需要處理');
        return null;
      }

      for (const attendRecord of attendRecords) {
        if (!attendRecord) continue;

        const workRecords = await this.findUserRecords(attendRecord);
        this.deleteUnknownRecord(workRecords);
        await this.appointAttendRecordType(workRecords);
      }

      // 返回第一筆記錄的建立時間
      return attendRecords[0]?.createTime || null;
    } catch (error) {
      this.logger.error('決定打卡記錄類型失敗', error);
      throw error;
    }
  }

  /**
   * 尋找未決定上下班類型的紀錄
   * 對應原始 Python 中的 find_undecided_records 方法
   */
  async findUndecidedRecords(): Promise<AttendRecord[]> {
    return await this.attendRecordRepository.find({
      where: { attendType: TYPE_UNKNOWN } as any,
      order: { createTime: 'ASC' } as any,
    });
  }

  /**
   * 刪除不明上下班類型的紀錄(重複打卡)，並記錄在資料庫上
   * 對應原始 Python 中的 delete_unknown_record 方法
   */
  private deleteUnknownRecord(workRecords: AttendRecord[]): void {
    const size = workRecords.length;
    if (size > 1 && size % 2 !== 0) {
      const unknownRecord = workRecords[workRecords.length - 2];
      this.updateAttendRecord(unknownRecord, TYPE_UNKNOWN);
      workRecords.splice(workRecords.length - 2, 1);

      this.logger.log(
        `刪除重複打卡記錄: ${unknownRecord.staffId}, 時間: ${unknownRecord.createTime}`,
      );
    }
  }

  /**
   * 決定當日打卡記錄的類型
   * 對應原始 Python 中的 appoint_attend_record_type 方法
   */
  private async appointAttendRecordType(
    workRecords: AttendRecord[],
  ): Promise<void> {
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

  /**
   * 尋找該員工同一天的打卡記錄
   * 對應原始 Python 中的 find_user_records 方法
   */
  async findUserRecords(attendRecord: AttendRecord): Promise<AttendRecord[]> {
    return await this.findUserRecords1(
      attendRecord.staffName || '',
      attendRecord.createTime,
    );
  }

  /**
   * 尋找該員工同一天的打卡記錄（方法1）
   * 對應原始 Python 中的 find_user_records1 方法
   */
  async findUserRecords1(
    staffName: string,
    time: Date,
  ): Promise<AttendRecord[]> {
    const workDay = new Date(time);

    // 如果時間在凌晨5點前，算作前一天
    if (workDay.getHours() < 5) {
      workDay.setDate(workDay.getDate() - 1);
    }

    // 設定工作時間範圍（從凌晨5點開始）
    const defaultWorkTimeStart = new Date(workDay);
    defaultWorkTimeStart.setHours(5, 0, 0, 0);

    const defaultWorkTimeEnd = new Date(defaultWorkTimeStart);
    defaultWorkTimeEnd.setDate(defaultWorkTimeEnd.getDate() + 1);

    const workRecords = await this.attendRecordRepository
      .createQueryBuilder('ar')
      .where('ar.createTime >= :startTime', { startTime: defaultWorkTimeStart })
      .andWhere('ar.createTime < :endTime', { endTime: defaultWorkTimeEnd })
      .andWhere('ar.staffName = :staffName', { staffName })
      .orderBy('ar.createTime', 'ASC')
      .getMany();

    this.logger.debug(
      `查詢員工打卡記錄: ${staffName}, 時間範圍: ${String(defaultWorkTimeStart)} - ${String(defaultWorkTimeEnd)}, 記錄數: ${workRecords.length}`,
    );

    return workRecords;
  }

  /**
   * 尋找該員工同一天的打卡記錄（方法2）
   * 對應原始 Python 中的 find_user_records2 方法
   */
  async findUserRecords2(
    staffName: string,
    time: Date,
    attendType: number,
  ): Promise<AttendRecord[]> {
    const workDay = new Date(time);

    // 如果時間在凌晨5點前，算作前一天
    if (workDay.getHours() < 5) {
      workDay.setDate(workDay.getDate() - 1);
    }

    // 設定工作時間範圍（從凌晨5點開始）
    const defaultWorkTimeStart = new Date(workDay);
    defaultWorkTimeStart.setHours(5, 0, 0, 0);

    const defaultWorkTimeEnd = new Date(defaultWorkTimeStart);
    defaultWorkTimeEnd.setDate(defaultWorkTimeEnd.getDate() + 1);

    const workRecords = await this.attendRecordRepository
      .createQueryBuilder('ar')
      .where('ar.createTime >= :startTime', { startTime: defaultWorkTimeStart })
      .andWhere('ar.createTime < :endTime', { endTime: defaultWorkTimeEnd })
      .andWhere('ar.staffName = :staffName', { staffName })
      .andWhere('ar.attendType = :attendType', { attendType })
      .orderBy('ar.createTime', 'ASC')
      .getMany();

    this.logger.debug(
      `查詢員工特定類型打卡記錄: ${staffName}, 類型: ${attendType}, 時間範圍: ${String(defaultWorkTimeStart)} - ${String(defaultWorkTimeEnd)}, 記錄數: ${workRecords.length}`,
    );

    return workRecords;
  }

  /**
   * 更新出勤記錄
   * 對應原始 Python 中的 update_attend_record 方法
   */
  private async updateAttendRecord(
    record: AttendRecord,
    attendType: number,
  ): Promise<void> {
    try {
      record.attendType = attendType;
      const savedRecord = await this.attendRecordRepository.save(record);

      const finalRecord = Array.isArray(savedRecord)
        ? savedRecord[0]
        : savedRecord;
      this.logger.debug(`更新出勤記錄成功: ${JSON.stringify(finalRecord)}`);
    } catch (error) {
      this.logger.warn(`更新出勤記錄失敗: ${record.id}`, error);
      throw error;
    }
  }

  /**
   * 取得公司預設最早上班時間
   */
  getCompanyStartWorkTime(): number {
    return 5; // 凌晨5點
  }

  /**
   * 檢查員工是否需要打卡
   */
  async isStaffNeedCheck(staffName: string): Promise<boolean> {
    try {
      const staff = await this.staffRepository.findOne({
        where: { name: staffName } as any,
      });

      return staff?.need_check || false;
    } catch (error) {
      this.logger.warn(`檢查員工打卡需求失敗: ${staffName}`, error);
      return false;
    }
  }
}
