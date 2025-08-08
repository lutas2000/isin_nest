import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffManhourService } from './staff-manhour.service';
import { StaffManhourController } from './staff-manhour.controller';
import { StaffManhour } from './entities/staff-manhour.entity';
import { StaffModule } from '../staff/staff.module'; // 引入 StaffModule 以使用 Staff 實體

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffManhour]), // 匯入對應的實體
    StaffModule, // 匯入 StaffModule 以支援關聯查詢
  ],
  providers: [StaffManhourService],
  controllers: [StaffManhourController],
  exports: [StaffManhourService], // 導出服務供其他模組使用
})
export class StaffManhourModule {}
