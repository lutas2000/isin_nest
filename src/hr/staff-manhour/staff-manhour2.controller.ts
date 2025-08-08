import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { BaseManhourController } from './base-manhour.controller';

@ApiTags('員工工時管理 (內帳)')
@Controller('staff-manhours2') // 路由前綴為 /staff-manhours2
export class StaffManhour2Controller extends BaseManhourController<StaffManhour2> {
  constructor(private readonly staffManhour2Service: StaffManhour2Service) {
    super(staffManhour2Service, StaffManhour2, '(內帳)');
  }

  protected getQueryAlias(): string {
    return 'manhour2';
  }
}