import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignWorkOrderService } from './design-work-order.service';
import { DesignWorkOrderController } from './design-work-order.controller';
import { DesignWorkOrder } from './entities/design-work-order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DesignWorkOrder])],
  providers: [DesignWorkOrderService],
  controllers: [DesignWorkOrderController],
  exports: [DesignWorkOrderService, TypeOrmModule],
})
export class DesignWorkOrderModule {}
