import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendRecord } from './entities/attend-record.entity';
import { Staff } from '../staff/entities/staff.entity';

export interface CreateAttendRecordDto {
  staffId: string;
  staffName?: string;
  inputType?: string;
  attendType: number;
}

export interface UpdateAttendRecordDto {
  staffId?: string;
  staffName?: string;
  inputType?: string;
  attendType?: number;
}

@Injectable()
export class AttendRecordService {
  constructor(
    @InjectRepository(AttendRecord)
    private readonly attendRecordRepository: Repository<AttendRecord>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  /**
   * 建立新的出勤記錄
   */
  async create(
    createAttendRecordDto: CreateAttendRecordDto,
  ): Promise<AttendRecord> {
    // 驗證員工是否存在
    await this.validateStaffExists(createAttendRecordDto.staffId);

    // 驗證出勤類型
    this.validateAttendType(createAttendRecordDto.attendType);

    // 檢查是否有重複打卡（同一天同一類型）
    await this.checkDuplicateAttendance(
      createAttendRecordDto.staffId,
      createAttendRecordDto.attendType,
    );

    const attendRecord = this.attendRecordRepository.create(
      createAttendRecordDto,
    );
    const savedRecord = await this.attendRecordRepository.save(attendRecord);
    return Array.isArray(savedRecord)
      ? (savedRecord[0] as AttendRecord)
      : savedRecord;
  }

  /**
   * 取得所有出勤記錄（支援分頁）
   */
  async findAll(page: number = 1, limit: number = 50): Promise<AttendRecord[]> {
    // 限制最大每頁筆數
    const maxLimit = Math.min(limit, 100);
    const skip = (page - 1) * maxLimit;

    return await this.attendRecordRepository.find({
      relations: ['staff'],
      order: { createTime: 'DESC' },
      take: maxLimit,
      skip: skip,
    });
  }

  /**
   * 根據ID取得出勤記錄
   */
  async findOne(id: number): Promise<AttendRecord> {
    const attendRecord = await this.attendRecordRepository.findOne({
      where: { id },
      relations: ['staff'],
    });

    if (!attendRecord) {
      throw new NotFoundException(`出勤記錄 ID ${id} 不存在`);
    }

    return attendRecord;
  }

  /**
   * 根據員工ID取得出勤記錄
   */
  async findByStaffId(staffId: string): Promise<AttendRecord[]> {
    return await this.attendRecordRepository.find({
      where: { staffId },
      relations: ['staff'],
      order: { createTime: 'DESC' },
    });
  }

  /**
   * 根據日期範圍取得出勤記錄
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<AttendRecord[]> {
    return await this.attendRecordRepository
      .createQueryBuilder('attendRecord')
      .leftJoinAndSelect('attendRecord.staff', 'staff')
      .where('attendRecord.createTime >= :startDate', { startDate })
      .andWhere('attendRecord.createTime <= :endDate', { endDate })
      .orderBy('attendRecord.createTime', 'DESC')
      .getMany();
  }

  /**
   * 根據員工ID和日期範圍取得出勤記錄
   */
  async findByStaffIdAndDateRange(
    staffId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendRecord[]> {
    return await this.attendRecordRepository
      .createQueryBuilder('attendRecord')
      .leftJoinAndSelect('attendRecord.staff', 'staff')
      .where('attendRecord.staffId = :staffId', { staffId })
      .andWhere('attendRecord.createTime >= :startDate', { startDate })
      .andWhere('attendRecord.createTime <= :endDate', { endDate })
      .orderBy('attendRecord.createTime', 'DESC')
      .getMany();
  }

  /**
   * 更新出勤記錄
   */
  async update(
    id: number,
    updateAttendRecordDto: UpdateAttendRecordDto,
  ): Promise<AttendRecord> {
    const attendRecord = await this.findOne(id);

    Object.assign(attendRecord, updateAttendRecordDto);

    const savedRecord = await this.attendRecordRepository.save(attendRecord);
    return Array.isArray(savedRecord)
      ? (savedRecord[0] as AttendRecord)
      : savedRecord;
  }

  /**
   * 刪除出勤記錄
   */
  async remove(id: number): Promise<void> {
    const attendRecord = await this.findOne(id);
    await this.attendRecordRepository.remove(attendRecord);
  }

  /**
   * 根據出勤類型取得記錄
   */
  async findByAttendType(attendType: number): Promise<AttendRecord[]> {
    return await this.attendRecordRepository.find({
      where: { attendType },
      relations: ['staff'],
      order: { createTime: 'DESC' },
    });
  }

  /**
   * 取得今日特定員工的出勤記錄
   */
  async findTodayByStaffId(staffId: string): Promise<AttendRecord[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    return await this.findByStaffIdAndDateRange(staffId, startOfDay, endOfDay);
  }

  /**
   * 驗證員工是否存在
   */
  private async validateStaffExists(staffId: string): Promise<void> {
    const staff = await this.staffRepository.findOne({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException(`員工 ${staffId} 不存在`);
    }
  }

  /**
   * 驗證出勤類型
   */
  private validateAttendType(attendType: number): void {
    const validTypes = [0, 1, 2];
    if (!validTypes.includes(attendType)) {
      throw new BadRequestException(
        `無效的出勤類型 ${attendType}，僅支援 0(未決定)、1(上班)、2(下班)`,
      );
    }
  }

  /**
   * 檢查重複打卡（同一天同一類型）
   */
  private async checkDuplicateAttendance(
    staffId: string,
    attendType: number,
  ): Promise<void> {
    // 僅檢查上班和下班打卡，未決定類型可以重複
    if (attendType === 0) return;

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
    );

    const existingRecord = await this.attendRecordRepository.findOne({
      where: {
        staffId,
        attendType,
      },
      order: { createTime: 'DESC' },
    });

    if (existingRecord) {
      const recordDate = new Date(existingRecord.createTime);
      if (recordDate >= startOfDay && recordDate <= endOfDay) {
        const typeText = attendType === 1 ? '上班' : '下班';
        throw new BadRequestException(
          `今日已有 ${typeText} 打卡記錄，請勿重複打卡`,
        );
      }
    }
  }
}
