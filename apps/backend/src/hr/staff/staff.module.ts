import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { Staff } from './entities/staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staff]), AuthModule],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService], // 導出服務供其他模組使用
})
export class StaffModule {}
