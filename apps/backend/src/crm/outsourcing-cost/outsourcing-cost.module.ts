import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutsourcingCostService } from './outsourcing-cost.service';
import { OutsourcingCostController } from './outsourcing-cost.controller';
import { OutsourcingCost } from './entities/outsourcing-cost.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([OutsourcingCost])],
  providers: [OutsourcingCostService],
  controllers: [OutsourcingCostController],
  exports: [OutsourcingCostService, TypeOrmModule],
})
export class OutsourcingCostModule {}
