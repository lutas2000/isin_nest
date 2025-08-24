import { Injectable, Logger } from '@nestjs/common';
import { SchedulePicker } from './schedule-picker';
import { WorkingHours } from './working-hours';
import { ManHourManager } from './man-hour-manager';

/**
 * 工時計算整合服務
 * 提供統一的工時計算介面，整合所有相關功能
 */
@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);

  constructor(
    private readonly schedulePicker: SchedulePicker,
    private readonly workingHours: WorkingHours,
    private readonly manHourManager: ManHourManager,
  ) {}

  /**
   * 完整的工時計算流程
   * 1. 決定打卡記錄類型
   * 2. 計算工時
   * @param date 日期
   */
  async calculateCompleteWorkingHours(date: Date): Promise<void> {
    try {
      this.logger.log(
        `開始完整工時計算流程: ${date.toISOString().split('T')[0]}`,
      );

      // 步驟1: 決定打卡記錄類型
      this.logger.log('步驟1: 決定打卡記錄類型');
      const firstRecordTime =
        await this.workingHours.appointAttendRecordsType();

      if (firstRecordTime) {
        this.logger.log(`第一筆打卡記錄時間: ${firstRecordTime.toISOString()}`);
      } else {
        this.logger.log('沒有需要處理的打卡記錄');
      }

      // 步驟2: 計算工時
      this.logger.log('步驟2: 計算工時');
      await this.manHourManager.calculateManHour(date);

      this.logger.log(
        `完成完整工時計算流程: ${date.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(`完整工時計算流程失敗: ${date.toISOString()}`, error);
      throw error;
    }
  }

  /**
   * 計算指定員工的休息時間
   * @param staffName 員工姓名
   * @param date 日期
   * @param workStartTime 工作開始時間
   * @param workEndTime 工作結束時間
   * @returns 休息時間（分鐘）
   */
  async calculateStaffBreakTime(
    staffName: string,
    date: Date,
    workStartTime: Date,
    workEndTime: Date,
  ): Promise<number> {
    try {
      // 初始化排程選擇器
      await this.schedulePicker.initialize(staffName, date);

      if (!this.schedulePicker.hasValidSegment()) {
        this.logger.warn(
          `員工 ${staffName} 沒有有效的段別設定，使用預設休息時間`,
        );
        return 60; // 預設1小時休息時間
      }

      const breakMinutes = this.schedulePicker.getBreakMinute(
        workStartTime,
        workEndTime,
      );

      this.logger.log(
        `員工 ${staffName} 休息時間計算: ${breakMinutes} 分鐘 (${(breakMinutes / 60).toFixed(2)} 小時)`,
      );

      return breakMinutes;
    } catch (error) {
      this.logger.error(`計算員工 ${staffName} 休息時間失敗`, error);
      return 60; // 發生錯誤時返回預設值
    }
  }

  /**
   * 取得員工段別設定資訊
   * @param staffName 員工姓名
   * @param date 日期
   * @returns 段別設定資訊
   */
  async getStaffSegmentInfo(staffName: string, date: Date): Promise<string> {
    try {
      await this.schedulePicker.initialize(staffName, date);
      return this.schedulePicker.getSegmentInfo();
    } catch (error) {
      this.logger.error(`取得員工 ${staffName} 段別設定資訊失敗`, error);
      return '無法取得段別設定資訊';
    }
  }

  /**
   * 處理指定員工的打卡記錄類型
   * @param staffName 員工姓名
   * @param date 日期
   */
  async processStaffAttendanceRecords(
    staffName: string,
    date: Date,
  ): Promise<void> {
    try {
      this.logger.log(
        `開始處理員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 的打卡記錄`,
      );

      // 取得該員工的打卡記錄
      const workRecords = await this.workingHours.findUserRecords1(
        staffName,
        date,
      );

      if (workRecords.length === 0) {
        this.logger.log(
          `員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 沒有打卡記錄`,
        );
        return;
      }

      // 處理打卡記錄類型
      this.workingHours['deleteUnknownRecord'](workRecords);
      await this.workingHours['appointAttendRecordType'](workRecords);

      this.logger.log(
        `完成處理員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 的打卡記錄`,
      );
    } catch (error) {
      this.logger.error(
        `處理員工 ${staffName} 打卡記錄失敗: ${date.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 取得工時統計摘要
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @returns 工時統計資訊
   */
  async getWorkingHoursSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalStaff: number;
    totalWorkHours: number;
    averageWorkHours: number;
    incompleteRecords: number;
  }> {
    try {
      return await this.manHourManager.calculateManHourSummary(
        startDate,
        endDate,
      );
    } catch (error) {
      this.logger.error(
        `取得工時統計摘要失敗: ${startDate.toISOString()} - ${endDate.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 檢查是否有未完成的工時記錄
   * @returns 未完成的工時記錄
   */
  async checkIncompleteWorkHours(): Promise<unknown> {
    try {
      const undoneRecord = await this.manHourManager.findUndoneWorkHour();

      if (undoneRecord) {
        const record = undoneRecord as { staffId: string; start_time: Date };
        this.logger.warn(
          `發現未完成的工時記錄: 員工 ${record.staffId}, 開始時間: ${record.start_time}`,
        );
      } else {
        this.logger.log('沒有未完成的工時記錄');
      }

      return undoneRecord;
    } catch (error) {
      this.logger.error('檢查未完成工時記錄失敗', error);
      throw error;
    }
  }

  /**
   * 重新計算指定日期範圍的工時
   * @param startDate 開始日期
   * @param endDate 結束日期
   */
  async recalculateWorkingHoursRange(
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    try {
              this.logger.log(
          `開始重新計算日期範圍工時: ${String(startDate).split('T')[0]} - ${String(endDate).split('T')[0]}`,
        );

      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        await this.calculateCompleteWorkingHours(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

              this.logger.log(
          `完成重新計算日期範圍工時: ${String(startDate).split('T')[0]} - ${String(endDate).split('T')[0]}`,
        );
    } catch (error) {
      this.logger.error(
        `重新計算日期範圍工時失敗: ${startDate.toISOString()} - ${endDate.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 取得系統狀態資訊
   * @returns 系統狀態資訊
   */
  async getSystemStatus(): Promise<{
    lastProcessedDate: Date | null;
    totalStaffCount: number;
    incompleteRecordsCount: number;
    systemHealth: string;
  }> {
    try {
      // 檢查未完成的工時記錄
      const undoneRecord = await this.manHourManager.findUndoneWorkHour();

      // 這裡可以加入更多系統狀態檢查邏輯
      const systemHealth = undoneRecord ? 'warning' : 'healthy';

      return {
        lastProcessedDate: new Date(), // 這裡應該從實際的處理記錄中取得
        totalStaffCount: 0, // 這裡應該從實際的員工資料中取得
        incompleteRecordsCount: undoneRecord ? 1 : 0,
        systemHealth,
      };
    } catch (error) {
      this.logger.error('取得系統狀態資訊失敗', error);
      throw error;
    }
  }
}
