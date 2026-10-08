import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryWorkOrderService } from './delivery-work-order.service';
import { DeliveryWorkOrderController } from './delivery-work-order.controller';
import { DeliveryWorkOrder } from './entities/delivery-work-order.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DeliveryWorkOrder])],
  providers: [DeliveryWorkOrderService],
  controllers: [DeliveryWorkOrderController],
  exports: [DeliveryWorkOrderService, TypeOrmModule],
})
export class DeliveryWorkOrderModule {}
