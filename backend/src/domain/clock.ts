/**
 * Injectable time source. Pure interface — no framework imports — so
 * cancellation-boundary tests (LOGIC-005, ровно 24 ч) don't depend on real wall-clock time.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}
