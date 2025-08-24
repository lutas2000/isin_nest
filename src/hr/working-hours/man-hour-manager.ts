import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { Staff } from '../staff/entities/staff.entity';
import { WorkingHours, TYPE_ON_WORK, TYPE_OFF_WORK } from './working-hours';

/**
 * 工時管理器
 * 對應原始 Python 中的 ManHourManager 類別
 */
@Injectable()
export class ManHourManager {
  private readonly logger = new Logger(ManHourManager.name);

  constructor(
    @InjectRepository(StaffManhour)
    private readonly staffManhourRepository: Repository<StaffManhour>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly workingHours: WorkingHours,
  ) {}

  /**
   * 計算指定日期的工時
   * 對應原始 Python 中的 calculate_man_hour 方法
   * @param date 日期
   */
  async calculateManHour(date: Date): Promise<void> {
    try {
      this.logger.log(`開始計算 ${date.toISOString().split('T')[0]} 的工時`);

      const nameList = await this.findNames(date);
      this.logger.log(`需要計算工時的員工數量: ${nameList.length}`);

      for (const name of nameList) {
        await this.calculateStaff(name, date);
      }

      this.logger.log(`完成計算 ${date.toISOString().split('T')[0]} 的工時`);
    } catch (error) {
      this.logger.error(`計算工時失敗: ${date.toISOString()}`, error);
      throw error;
    }
  }

  /**
   * 計算指定員工的工時
   * 對應原始 Python 中的 calculate_staff 方法
   * @param staffName 員工姓名
   * @param date 日期
   */
  async calculateStaff(staffName: string, date: Date): Promise<void> {
    try {
      this.logger.log(
        `開始計算員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 的工時`,
      );

      // 刪除該員工該日期的舊工時記錄
      await this.delManHour(staffName, date);

      // 取得上班和下班記錄
      const onRecords = await this.workingHours.findUserRecords2(
        staffName,
        date,
        TYPE_ON_WORK,
      );
      const offRecords = await this.workingHours.findUserRecords2(
        staffName,
        date,
        TYPE_OFF_WORK,
      );

      this.logger.debug(
        `員工 ${staffName} 上班記錄數: ${onRecords.length}, 下班記錄數: ${offRecords.length}`,
      );

      // 為每個上班記錄建立工時記錄
      for (let index = 0; index < onRecords.length; index++) {
        const onRecord = onRecords[index];
        const startTime = onRecord.createTime;

        // 建立新的工時記錄
        const manHour = this.staffManhourRepository.create({
          staffId: staffName, // 使用姓名作為員工ID
          start_time: startTime,
          day: date,
        });

        // 如果有對應的下班記錄，設定結束時間
        if (index < offRecords.length) {
          manHour.end_time = offRecords[index].createTime;

          // 計算工作時間（小時）
          const workTimeMs =
            offRecords[index].createTime.getTime() - startTime.getTime();
          manHour.work_time = workTimeMs / (1000 * 60 * 60); // 轉換為小時

          this.logger.debug(
            `員工 ${staffName} 工時記錄: 開始=${startTime.toISOString()}, 結束=${offRecords[index].createTime.toISOString()}, 工時=${manHour.work_time}小時`,
          );
        } else {
          this.logger.warn(
            `員工 ${staffName} 上班記錄 ${startTime.toISOString()} 沒有對應的下班記錄`,
          );
        }

        // 儲存工時記錄
        const savedManHour = await this.staffManhourRepository.save(manHour);
        const finalManHour = Array.isArray(savedManHour)
          ? savedManHour[0]
          : savedManHour;

        this.logger.log(`成功儲存工時記錄: ${finalManHour.id}`);
      }

      this.logger.log(
        `完成計算員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 的工時`,
      );
    } catch (error) {
      this.logger.error(
        `計算員工 ${staffName} 工時失敗: ${date.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 刪除指定員工指定日期的工時記錄
   * 對應原始 Python 中的 del_man_hour 方法
   * @param staffName 員工姓名
   * @param date 日期
   */
  async delManHour(staffName: string, date: Date): Promise<void> {
    try {
      const result = await this.staffManhourRepository.delete({
        staffId: staffName,
        day: date,
      } as any);

      this.logger.log(
        `刪除員工 ${staffName} 在 ${date.toISOString().split('T')[0]} 的工時記錄: ${result.affected} 筆`,
      );
    } catch (error) {
      this.logger.warn(
        `刪除員工 ${staffName} 工時記錄失敗: ${date.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 搜尋當日需打卡員工列表
   * 對應原始 Python 中的 find_names 方法
   * @param date 日期
   * @returns 員工姓名列表
   */
  async findNames(date: Date): Promise<string[]> {
    try {
      const staffList = await this.staffRepository
        .createQueryBuilder('staff')
        .select('staff.name')
        .where('staff.need_check = :needCheck', { needCheck: true })
        .andWhere('staff.begain_work <= :date', { date })
        .andWhere('(staff.stop_work >= :date OR staff.stop_work IS NULL)', {
          date,
        })
        .getRawMany();

      const names = staffList.map((staff) => staff.staff_name);

      this.logger.debug(`找到需要打卡的員工: ${names.join(', ')}`);
      return names;
    } catch (error) {
      this.logger.error(`搜尋需打卡員工列表失敗: ${date.toISOString()}`, error);
      throw error;
    }
  }

  /**
   * 尋找未完成工時記錄
   * 對應原始 Python 中的 find_undone_work_hour 方法
   * @returns 未完成的工時記錄
   */
  async findUndoneWorkHour(): Promise<StaffManhour | null> {
    try {
      const undoneRecord = await this.staffManhourRepository.findOne({
        where: { end_time: null } as any,
        order: { id: 'ASC' } as any,
      });

      if (undoneRecord) {
        this.logger.debug(
          `找到未完成工時記錄: ${undoneRecord.id}, 員工: ${undoneRecord.staffId}`,
        );
      }

      return undoneRecord;
    } catch (error) {
      this.logger.error('搜尋未完成工時記錄失敗', error);
      throw error;
    }
  }

  /**
   * 取得指定員工指定日期的工時記錄
   * @param staffName 員工姓名
   * @param date 日期
   * @returns 工時記錄列表
   */
  async getStaffManHours(
    staffName: string,
    date: Date,
  ): Promise<StaffManhour[]> {
    try {
      return await this.staffManhourRepository.find({
        where: {
          staffId: staffName,
          day: date,
        } as any,
        order: { startTime: 'ASC' } as any,
      });
    } catch (error) {
      this.logger.error(
        `取得員工 ${staffName} 工時記錄失敗: ${date.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 計算指定日期範圍的工時統計
   * @param startDate 開始日期
   * @param endDate 結束日期
   * @returns 工時統計資訊
   */
  async calculateManHourSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalStaff: number;
    totalWorkHours: number;
    averageWorkHours: number;
    incompleteRecords: number;
  }> {
    try {
      const manHours = await this.staffManhourRepository.find({
        where: {
          day: {
            $gte: startDate,
            $lte: endDate,
          } as any,
        } as any,
        relations: ['staff'],
      });

      const totalStaff = new Set(manHours.map((mh) => mh.staffId)).size;
      const totalWorkHours = manHours.reduce(
        (sum, mh) => sum + (mh.work_time || 0),
        0,
      );
      const averageWorkHours = totalStaff > 0 ? totalWorkHours / totalStaff : 0;
      const incompleteRecords = manHours.filter((mh) => !mh.end_time).length;

      return {
        totalStaff,
        totalWorkHours,
        averageWorkHours,
        incompleteRecords,
      };
    } catch (error) {
      this.logger.error(
        `計算工時統計失敗: ${startDate.toISOString()} - ${endDate.toISOString()}`,
        error,
      );
      throw error;
    }
  }
}
