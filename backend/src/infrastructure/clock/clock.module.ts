import { Global, Module } from '@nestjs/common';
import { SystemClock } from '../../domain/clock';

export const CLOCK = Symbol('CLOCK');

@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
