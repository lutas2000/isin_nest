import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffManhour } from '../staff-manhour/entities/staff-manhour.entity';
import { Staff } from '../staff/entities/staff.entity';
import {
  WorkingHours,
  TYPE_OFF_WORK,
  TYPE_ON_WORK,
} from './working-hours';

/**
 * 工時管理器
 * 對應原始 Python 中的 ManHourManager 類別，但所有關聯都使用 staff.id。
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

  /** 計算指定工作日的所有需打卡員工工時。 */
  async calculateManHour(date: Date): Promise<void> {
    try {
      this.logger.log(`開始計算 ${date.toISOString().split('T')[0]} 的工時`);

      const staffIds = await this.findStaffIds(date);
      this.logger.log(`需要計算工時的員工數量: ${staffIds.length}`);

      for (const staffId of staffIds) {
        await this.calculateStaff(staffId, date);
      }

      this.logger.log(`完成計算 ${date.toISOString().split('T')[0]} 的工時`);
    } catch (error) {
      this.logger.error(`計算工時失敗: ${date.toISOString()}`, error);
      throw error;
    }
  }

  /** 計算指定員工的工時，參數接受 staff.id（姓名僅作相容解析）。 */
  async calculateStaff(staffIdentifier: string, date: Date): Promise<void> {
    const staffId = await this.resolveStaffId(staffIdentifier);
    try {
      this.logger.log(
        `開始計算員工 ${staffId} 在 ${date.toISOString().split('T')[0]} 的工時`,
      );

      await this.delManHour(staffId, date);

      const onRecords = await this.workingHours.findUserRecords2(
        staffId,
        date,
        TYPE_ON_WORK,
      );
      const offRecords = await this.workingHours.findUserRecords2(
        staffId,
        date,
        TYPE_OFF_WORK,
      );

      for (let index = 0; index < onRecords.length; index++) {
        const onRecord = onRecords[index];
        const startTime = onRecord.createTime;
        const offRecord = offRecords[index];
        const endTime = offRecord?.createTime;
        const workTime = endTime
          ? Math.max(0, (endTime.getTime() - startTime.getTime()) / 3600000)
          : 0;

        const manHour = this.staffManhourRepository.create({
          staffId,
          start_time: startTime,
          end_time: endTime,
          day: date,
          work_time: workTime,
        });

        await this.staffManhourRepository.save(manHour);
      }
    } catch (error) {
      this.logger.error(
        `計算員工 ${staffId} 工時失敗: ${date.toISOString()}`,
        error,
      );
      throw error;
    }
  }

  /** 刪除指定員工指定日期的重算結果。 */
  async delManHour(staffId: string, date: Date): Promise<void> {
    await this.staffManhourRepository.delete({
      staffId,
      day: date,
    } as any);
  }

  /** 找出指定日期仍在職且需要打卡的員工 ID。 */
  async findStaffIds(date: Date): Promise<string[]> {
    const staffList = await this.staffRepository
      .createQueryBuilder('staff')
      .select(['staff.id', 'staff.name'])
      .where('staff.need_check = :needCheck', { needCheck: true })
      .andWhere('staff.begain_work <= :date', { date })
      .andWhere('(staff.stop_work >= :date OR staff.stop_work IS NULL)', {
        date,
      })
      .getMany();

    return staffList.map((staff) => staff.id);
  }

  /** 舊呼叫端若仍需要姓名列表，可保留此讀取方法；計算流程不再使用它。 */
  async findNames(date: Date): Promise<string[]> {
    const staffList = await this.staffRepository
      .createQueryBuilder('staff')
      .select(['staff.id', 'staff.name'])
      .where('staff.need_check = :needCheck', { needCheck: true })
      .andWhere('staff.begain_work <= :date', { date })
      .andWhere('(staff.stop_work >= :date OR staff.stop_work IS NULL)', {
        date,
      })
      .getMany();

    return staffList.map((staff) => staff.name);
  }

  async findUndoneWorkHour(): Promise<StaffManhour | null> {
    return this.staffManhourRepository.findOne({
      where: { end_time: null } as any,
      order: { id: 'ASC' } as any,
    });
  }

  async getStaffManHours(
    staffId: string,
    date: Date,
  ): Promise<StaffManhour[]> {
    return this.staffManhourRepository.find({
      where: { staffId, day: date } as any,
      order: { start_time: 'ASC' } as any,
    });
  }

  async calculateManHourSummary(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalStaff: number;
    totalWorkHours: number;
    averageWorkHours: number;
    incompleteRecords: number;
  }> {
    const manHours = await this.staffManhourRepository
      .createQueryBuilder('mh')
      .leftJoinAndSelect('mh.staff', 'staff')
      .where('mh.day >= :startDate', { startDate })
      .andWhere('mh.day <= :endDate', { endDate })
      .getMany();

    const totalStaff = new Set(manHours.map((manHour) => manHour.staffId)).size;
    const totalWorkHours = manHours.reduce(
      (sum, manHour) => sum + (manHour.work_time || 0),
      0,
    );

    return {
      totalStaff,
      totalWorkHours,
      averageWorkHours: totalStaff > 0 ? totalWorkHours / totalStaff : 0,
      incompleteRecords: manHours.filter((manHour) => !manHour.end_time).length,
    };
  }

  private async resolveStaffId(staffIdentifier: string): Promise<string> {
    const repository = this.staffRepository as Repository<Staff> & {
      findOne?: Repository<Staff>['findOne'];
    };
    if (typeof repository.findOne !== 'function') return staffIdentifier;

    const byId = await repository.findOne({
      where: { id: staffIdentifier },
    });
    if (byId) return byId.id;

    const byName = await repository.findOne({
      where: { name: staffIdentifier } as any,
    });
    return byName?.id || staffIdentifier;
  }
}
