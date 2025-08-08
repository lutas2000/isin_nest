import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffManhour } from './entities/staff-manhour.entity';
import { BaseManhourService } from './base-manhour.service';

@Injectable()
export class StaffManhourService extends BaseManhourService<StaffManhour> {
  constructor(
    @InjectRepository(StaffManhour)
    private staffManhourRepository: Repository<StaffManhour>,
  ) {
    super(staffManhourRepository);
  }

  // 如果需要特殊的業務邏輯，可以在這裡覆寫或新增方法
}
