import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { Staff } from './entities/staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staff])], // 匯入對應的實體
  providers: [StaffService],
  controllers: [StaffController],
})
export class StaffModule {}
