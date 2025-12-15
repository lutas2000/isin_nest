import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrderItemService } from './work-order-item.service';
import { WorkOrderItemController } from './work-order-item.controller';
import { WorkOrderItem } from './entities/work-order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkOrderItem])],
  providers: [WorkOrderItemService],
  controllers: [WorkOrderItemController],
  exports: [WorkOrderItemService],
})
export class WorkOrderItemModule {}

