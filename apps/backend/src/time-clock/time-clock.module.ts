import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RealandM70Client } from './realand-m70.client';
import { TIME_CLOCK_OPTIONS } from './time-clock.constants';
import { TimeClockModuleOptions } from './time-clock.types';
import { TimeClockService } from './time-clock.service';

@Module({})
export class TimeClockModule {
  static register(options: TimeClockModuleOptions = {}): DynamicModule {
    const optionsProvider: Provider = {
      provide: TIME_CLOCK_OPTIONS,
      useValue: options,
    };

    return {
      module: TimeClockModule,
      providers: [optionsProvider, RealandM70Client, TimeClockService],
      exports: [RealandM70Client, TimeClockService],
    };
  }
}
