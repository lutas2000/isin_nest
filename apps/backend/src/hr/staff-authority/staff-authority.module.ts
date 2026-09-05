import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffAuthorityService } from './staff-authority.service';
import { StaffAuthorityController } from './staff-authority.controller';
import { StaffAuthority } from './entities/staff-authority.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StaffAuthority])],
  providers: [StaffAuthorityService],
  controllers: [StaffAuthorityController],
  exports: [StaffAuthorityService],
})
export class StaffAuthorityModule {}
