import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmConfigService } from './config.service';
import { CrmConfigController } from './config.controller';
import { CrmConfig } from './entities/crm-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CrmConfig])],
  controllers: [CrmConfigController],
  providers: [CrmConfigService],
  exports: [CrmConfigService],
})
export class CrmConfigModule {}






