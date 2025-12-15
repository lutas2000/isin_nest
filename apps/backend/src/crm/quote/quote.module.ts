import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { Quote } from './entities/quote.entity';
import { QuoteItemModule } from '../quote-item/quote-item.module';
import { WorkOrderModule } from '../work-order/work-order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote]),
    QuoteItemModule,
    forwardRef(() => WorkOrderModule),
  ],
  providers: [QuoteService],
  controllers: [QuoteController],
  exports: [QuoteService],
})
export class QuoteModule {}

