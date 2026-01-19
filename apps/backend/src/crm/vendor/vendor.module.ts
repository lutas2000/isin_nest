import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { Vendor } from './entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor])],
  providers: [VendorService],
  controllers: [VendorController],
  exports: [VendorService],
})
export class VendorModule {}
