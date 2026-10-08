import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignWorkOrderService } from './design-work-order.service';
import { DesignWorkOrderController } from './design-work-order.controller';
import { DesignWorkOrder } from './entities/design-work-order.entity';
import { Nesting } from '../nesting/entities/nesting.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([DesignWorkOrder, Nesting])],
  providers: [DesignWorkOrderService],
  controllers: [DesignWorkOrderController],
  exports: [DesignWorkOrderService, TypeOrmModule],
})
export class DesignWorkOrderModule {}
