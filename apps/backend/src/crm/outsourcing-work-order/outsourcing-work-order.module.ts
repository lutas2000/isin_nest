import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutsourcingWorkOrderService } from './outsourcing-work-order.service';
import { OutsourcingWorkOrderController } from './outsourcing-work-order.controller';
import { OutsourcingWorkOrder } from './entities/outsourcing-work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OutsourcingWorkOrder])],
  providers: [OutsourcingWorkOrderService],
  controllers: [OutsourcingWorkOrderController],
  exports: [OutsourcingWorkOrderService, TypeOrmModule],
})
export class OutsourcingWorkOrderModule {}
