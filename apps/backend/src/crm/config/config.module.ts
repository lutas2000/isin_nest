import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmConfigService } from './config.service';
import { CrmConfigController } from './config.controller';
import { CrmConfig } from './entities/crm-config.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CrmConfig])],
  controllers: [CrmConfigController],
  providers: [CrmConfigService],
  exports: [CrmConfigService],
})
export class CrmConfigModule {}







