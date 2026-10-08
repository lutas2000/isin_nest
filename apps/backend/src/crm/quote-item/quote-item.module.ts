import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteItemService } from './quote-item.service';
import { QuoteItemController } from './quote-item.controller';
import { QuoteItem } from './entities/quote-item.entity';
import { Quote } from '../quote/entities/quote.entity';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([QuoteItem, Quote])],
  providers: [QuoteItemService],
  controllers: [QuoteItemController],
  exports: [QuoteItemService],
})
export class QuoteItemModule {}

