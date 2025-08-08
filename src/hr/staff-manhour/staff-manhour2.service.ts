import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { BaseManhourService } from './base-manhour.service';

@Injectable()
export class StaffManhour2Service extends BaseManhourService<StaffManhour2> {
  constructor(
    @InjectRepository(StaffManhour2)
    private staffManhour2Repository: Repository<StaffManhour2>,
  ) {
    super(staffManhour2Repository);
  }

  // 如果需要特殊的業務邏輯，可以在這裡覆寫或新增方法
}
