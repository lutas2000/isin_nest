import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessingService } from './processing.service';
import { ProcessingController } from './processing.controller';
import { Processing } from './entities/processing.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Processing])],
  providers: [ProcessingService],
  controllers: [ProcessingController],
  exports: [ProcessingService],
})
export class ProcessingModule {}
