import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order } from './entities/order.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Order])],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService, TypeOrmModule],
})
export class OrderModule {}
