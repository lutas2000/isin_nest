import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestingService } from './nesting.service';
import { NestingController } from './nesting.controller';
import { Nesting } from './entities/nesting.entity';
import { NestingItem } from './entities/nesting-item.entity';
import { OrderItemModule } from '../order-item/order-item.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nesting, NestingItem]),
    OrderItemModule,
  ],
  providers: [NestingService],
  controllers: [NestingController],
  exports: [NestingService, TypeOrmModule],
})
export class NestingModule {}
