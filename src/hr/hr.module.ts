import { Module } from '@nestjs/common';
import { StaffModule } from './staff/staff.module';
import { StaffLeaveModule } from './staff-leave/staff-leave.module';
import { StaffManhourModule } from './staff-manhour/staff-manhour.module';
import { StaffManhour2Module } from './staff-manhour/staff-manhour2.module';
import { StaffSegmentModule } from './staff-segment/staff-segment.module';

@Module({
  imports: [
    // 員工基本資料管理
    StaffModule,
    
    // 員工請假管理
    StaffLeaveModule,
    
    // 員工工時管理
    StaffManhourModule,
    StaffManhour2Module,
    
    // 員工段別管理
    StaffSegmentModule,
  ],
  exports: [
    // 匯出所有子模組，讓其他模組可以使用
    StaffModule,
    StaffLeaveModule,
    StaffManhourModule,
    StaffManhour2Module,
    StaffSegmentModule,
  ],
})
export class HrModule {}
