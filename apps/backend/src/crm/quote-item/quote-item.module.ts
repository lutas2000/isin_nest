import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteItemService } from './quote-item.service';
import { QuoteItemController } from './quote-item.controller';
import { QuoteItem } from './entities/quote-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuoteItem])],
  providers: [QuoteItemService],
  controllers: [QuoteItemController],
  exports: [QuoteItemService],
})
export class QuoteItemModule {}

