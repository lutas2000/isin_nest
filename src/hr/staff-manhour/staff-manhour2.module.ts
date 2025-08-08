import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffManhour2Service } from './staff-manhour2.service';
import { StaffManhour2Controller } from './staff-manhour2.controller';
import { StaffManhour2 } from './entities/staff-manhour2.entity';
import { StaffModule } from '../staff/staff.module'; // 引入 StaffModule 以使用 Staff 實體

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffManhour2]), // 匯入對應的實體
    StaffModule, // 匯入 StaffModule 以支援關聯查詢
  ],
  providers: [StaffManhour2Service],
  controllers: [StaffManhour2Controller],
  exports: [StaffManhour2Service], // 導出服務供其他模組使用
})
export class StaffManhour2Module {}
