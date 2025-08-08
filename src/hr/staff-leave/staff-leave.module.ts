import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffLeaveService } from './staff-leave.service';
import { StaffLeaveController } from './staff-leave.controller';
import { StaffLeave } from './entities/staff-leave.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StaffLeave])], // 匯入對應的實體
  providers: [StaffLeaveService],
  controllers: [StaffLeaveController],
  exports: [StaffLeaveService], // 導出服務供其他模組使用
})
export class StaffLeaveModule {}
