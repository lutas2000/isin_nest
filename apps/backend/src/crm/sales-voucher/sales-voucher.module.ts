import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesVoucher } from './entities/sales-voucher.entity';
import { SalesVoucherItem } from '../sales-voucher-item/entities/sales-voucher-item.entity';
import { SalesVoucherService } from './sales-voucher.service';
import { SalesVoucherController } from './sales-voucher.controller';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalesVoucher, SalesVoucherItem]),
    OrderModule,
  ],
  providers: [SalesVoucherService],
  controllers: [SalesVoucherController],
  exports: [SalesVoucherService, TypeOrmModule],
})
export class SalesVoucherModule {}
