import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemService } from './order-item.service';
import { OrderItemController } from './order-item.controller';
import { OrderItem } from './entities/order-item.entity';
import { DesignWorkOrderModule } from '../design-work-order/design-work-order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem]),
    forwardRef(() => DesignWorkOrderModule),
  ],
  providers: [OrderItemService],
  controllers: [OrderItemController],
  exports: [OrderItemService, TypeOrmModule],
})
export class OrderItemModule {}
