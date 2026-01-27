import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessingWorkOrderService } from './processing-work-order.service';
import { ProcessingWorkOrderController } from './processing-work-order.controller';
import { ProcessingWorkOrder } from './entities/processing-work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessingWorkOrder])],
  providers: [ProcessingWorkOrderService],
  controllers: [ProcessingWorkOrderController],
  exports: [ProcessingWorkOrderService, TypeOrmModule],
})
export class ProcessingWorkOrderModule {}
