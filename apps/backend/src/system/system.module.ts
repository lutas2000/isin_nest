import { Module } from '@nestjs/common';
import { NasController } from './nas/nas.controller';
import { NasService } from './nas/nas.service';

@Module({
  controllers: [NasController],
  providers: [NasService],
})
export class SystemModule {}
