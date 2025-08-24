import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffSegment } from '../staff-segment/entities/staff-segment.entity';

/**
 * 用於計算上班時間的排程選擇器
 * 對應原始 Python 中的 SchedulePicker 類別
 */
@Injectable()
export class SchedulePicker {
  private readonly logger = new Logger(SchedulePicker.name);
  private segment: StaffSegment | null = null;

  constructor(
    @InjectRepository(StaffSegment)
    private readonly staffSegmentRepository: Repository<StaffSegment>,
  ) {}

  /**
   * 初始化排程選擇器
   * @param name 員工姓名
   * @param date 日期
   */
  async initialize(name: string, date: Date): Promise<void> {
    try {
      this.segment = await this.staffSegmentRepository
        .createQueryBuilder('segment')
        .where('segment.staffId = :name', { name })
        .andWhere('segment.create_date <= :date', { date })
        .orderBy('segment.create_date', 'DESC')
        .getOne();

      if (!this.segment) {
        this.logger.warn(`找不到員工 ${name} 在 ${String(date)} 的段別設定`);
      }
    } catch (error) {
      this.logger.error(`初始化排程選擇器失敗: ${name}, ${date}`, error);
      throw error;
    }
  }

  /**
   * 取得段別設定
   */
  getSegment(): StaffSegment | null {
    return this.segment;
  }

  /**
   * 計算休息時間（小時）
   * @param workStartTime 工作開始時間
   * @param workEndTime 工作結束時間
   * @returns 休息時間（小時）
   */
  getBreakHour(workStartTime: Date, workEndTime: Date): number {
    return this.getBreakMinute(workStartTime, workEndTime) / 60;
  }

  /**
   * 計算休息時間（分鐘）
   * @param workStartTime 工作開始時間
   * @param workEndTime 工作結束時間
   * @returns 休息時間（分鐘）
   */
  getBreakMinute(workStartTime: Date, workEndTime: Date): number {
    if (!this.segment) {
      this.logger.warn('段別設定未初始化，無法計算休息時間');
      return 0;
    }

    let breakMinute = 0;

    // 中午休息時間 (12:00)
    const breakStartTime1 = new Date(workStartTime);
    breakStartTime1.setHours(12, 0, 0, 0);
    const breakEndTime1 = new Date(breakStartTime1);
    breakEndTime1.setMinutes(
      breakEndTime1.getMinutes() + this.segment.rest_time,
    );

    // 晚上休息時間 (18:00)
    const breakStartTime2 = new Date(workStartTime);
    breakStartTime2.setHours(18, 0, 0, 0);
    const breakEndTime2 = new Date(breakStartTime2);
    breakEndTime2.setMinutes(
      breakEndTime2.getMinutes() + this.segment.rest_time2,
    );

    // 檢查是否包含中午休息時間
    if (workStartTime <= breakStartTime1 && workEndTime >= breakEndTime1) {
      breakMinute += this.segment.rest_time;
    }

    // 檢查是否包含晚上休息時間
    if (workStartTime <= breakStartTime2 && workEndTime >= breakEndTime2) {
      breakMinute += this.segment.rest_time2;
    }

    this.logger.debug(
      `休息時間計算: 開始=${workStartTime.toISOString()}, 結束=${workEndTime.toISOString()}, 休息分鐘=${breakMinute}`,
    );

    return breakMinute;
  }

  /**
   * 檢查是否有有效的段別設定
   */
  hasValidSegment(): boolean {
    return this.segment !== null;
  }

  /**
   * 取得段別設定的詳細資訊
   */
  getSegmentInfo(): string {
    if (!this.segment) {
      return '無段別設定';
    }

    return `段別ID: ${this.segment.id}, 休息時間: ${this.segment.rest_time}分鐘, 加班休息時間: ${this.segment.rest_time2}分鐘`;
  }
}
