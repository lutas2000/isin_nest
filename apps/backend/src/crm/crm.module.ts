import { Module } from '@nestjs/common';
import { CustomerModule } from './customer/customer.module';
import { ContactModule } from './contact/contact.module';
import { QuoteModule } from './quote/quote.module';
import { QuoteItemModule } from './quote-item/quote-item.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { WorkOrderItemModule } from './work-order-item/work-order-item.module';
import { CrmConfigModule } from './config/config.module';
import { VendorModule } from './vendor/vendor.module';
import { ProcessingModule } from './processing/processing.module';

@Module({
  imports: [
    CustomerModule,
    ContactModule,
    QuoteModule,
    QuoteItemModule,
    WorkOrderModule,
    WorkOrderItemModule,
    CrmConfigModule,
    VendorModule,
    ProcessingModule,
  ],
  exports: [
    CustomerModule,
    ContactModule,
    QuoteModule,
    QuoteItemModule,
    WorkOrderModule,
    WorkOrderItemModule,
    CrmConfigModule,
    VendorModule,
    ProcessingModule,
  ],
})
export class CrmModule {}

