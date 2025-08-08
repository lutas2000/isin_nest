import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffManhourService } from './staff-manhour.service';
import { StaffManhour } from './entities/staff-manhour.entity';
import { BaseManhourController } from './base-manhour.controller';

@ApiTags('員工工時管理')
@Controller('staff-manhours') // 路由前綴為 /staff-manhours
export class StaffManhourController extends BaseManhourController<StaffManhour> {
  constructor(private readonly staffManhourService: StaffManhourService) {
    super(staffManhourService, StaffManhour, '');
  }

  protected getQueryAlias(): string {
    return 'manhour';
  }
}
