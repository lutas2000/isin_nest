import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>, // 注入 Repository
  ) {}

  findAll(): Promise<Staff[]> {
    return this.staffRepository.find();
  }

  findOne(id: string): Promise<Staff | null> {
    return this.staffRepository.findOneBy({ id });
  }

  async create(staff: Partial<Staff>): Promise<Staff> {
    const newStaff = this.staffRepository.create(staff); // 建立實體
    return this.staffRepository.save(newStaff); // 儲存到資料庫
  }

  async remove(id: string): Promise<void> {
    await this.staffRepository.delete(id);
  }

  async update(id: string, staff: Partial<Staff>): Promise<Staff | null> {
    const updatedStaff = await this.staffRepository.findOneBy({ id });
    if (updatedStaff) {
      Object.assign(updatedStaff, staff); // 更新實體的屬性
      return this.staffRepository.save(updatedStaff);
    }
    return null;
  }
}
