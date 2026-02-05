import { Module } from '@nestjs/common';
import { CustomerModule } from './customer/customer.module';
import { ContactModule } from './contact/contact.module';
import { QuoteModule } from './quote/quote.module';
import { QuoteItemModule } from './quote-item/quote-item.module';
import { OrderModule } from './order/order.module';
import { OrderItemModule } from './order-item/order-item.module';
import { CrmConfigModule } from './config/config.module';
import { VendorModule } from './vendor/vendor.module';
import { ProcessingModule } from './processing/processing.module';
import { DesignWorkOrderModule } from './design-work-order/design-work-order.module';
import { CuttingWorkOrderModule } from './cutting-work-order/cutting-work-order.module';
import { ProcessingWorkOrderModule } from './processing-work-order/processing-work-order.module';
import { DeliveryWorkOrderModule } from './delivery-work-order/delivery-work-order.module';
import { NestingModule } from './nesting/nesting.module';
import { OutsourcingCostModule } from './outsourcing-cost/outsourcing-cost.module';

@Module({
  imports: [
    CustomerModule,
    ContactModule,
    QuoteModule,
    QuoteItemModule,
    OrderModule,
    OrderItemModule,
    CrmConfigModule,
    VendorModule,
    ProcessingModule,
    DesignWorkOrderModule,
    CuttingWorkOrderModule,
    ProcessingWorkOrderModule,
    DeliveryWorkOrderModule,
    NestingModule,
    OutsourcingCostModule,
  ],
  exports: [
    CustomerModule,
    ContactModule,
    QuoteModule,
    QuoteItemModule,
    OrderModule,
    OrderItemModule,
    CrmConfigModule,
    VendorModule,
    ProcessingModule,
    DesignWorkOrderModule,
    CuttingWorkOrderModule,
    ProcessingWorkOrderModule,
    DeliveryWorkOrderModule,
    NestingModule,
    OutsourcingCostModule,
  ],
})
export class CrmModule {}

