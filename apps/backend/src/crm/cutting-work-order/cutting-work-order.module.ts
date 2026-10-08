import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuttingWorkOrderService } from './cutting-work-order.service';
import { CuttingWorkOrderController } from './cutting-work-order.controller';
import { CuttingWorkOrder } from './entities/cutting-work-order.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CuttingWorkOrder])],
  providers: [CuttingWorkOrderService],
  controllers: [CuttingWorkOrderController],
  exports: [CuttingWorkOrderService, TypeOrmModule],
})
export class CuttingWorkOrderModule {}
