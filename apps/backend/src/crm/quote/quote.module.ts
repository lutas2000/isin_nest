import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { Quote } from './entities/quote.entity';
import { QuoteItemModule } from '../quote-item/quote-item.module';
import { OrderModule } from '../order/order.module';
import { OrderItemModule } from '../order-item/order-item.module';
import { DesignWorkOrderModule } from '../design-work-order/design-work-order.module';
import { CuttingWorkOrderModule } from '../cutting-work-order/cutting-work-order.module';
import { ProcessingWorkOrderModule } from '../processing-work-order/processing-work-order.module';
import { DeliveryWorkOrderModule } from '../delivery-work-order/delivery-work-order.module';
import { Order } from '../order/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, Order]),
    QuoteItemModule,
    forwardRef(() => OrderModule),
    forwardRef(() => OrderItemModule),
    forwardRef(() => DesignWorkOrderModule),
    forwardRef(() => CuttingWorkOrderModule),
    forwardRef(() => ProcessingWorkOrderModule),
    forwardRef(() => DeliveryWorkOrderModule),
  ],
  providers: [QuoteService],
  controllers: [QuoteController],
  exports: [QuoteService],
})
export class QuoteModule {}

