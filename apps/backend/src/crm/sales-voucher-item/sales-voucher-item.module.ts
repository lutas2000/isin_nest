import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesVoucherItem } from './entities/sales-voucher-item.entity';
import { SalesVoucher } from '../sales-voucher/entities/sales-voucher.entity';
import { SalesVoucherItemService } from './sales-voucher-item.service';
import { SalesVoucherItemController } from './sales-voucher-item.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SalesVoucherItem, SalesVoucher])],
  providers: [SalesVoucherItemService],
  controllers: [SalesVoucherItemController],
  exports: [SalesVoucherItemService, TypeOrmModule],
})
export class SalesVoucherItemModule {}
