import { Clock } from './clock';

export const EARLY_CANCELLATION_THRESHOLD_HOURS = 24;

export type CancellationOutcome = 'early' | 'late' | 'not_allowed';

/**
 * Правило отмены (FR-16/FR-17, UC-3, LOGIC-005):
 * - >= 24ч до старта (включительно, "ровно 24ч" = ранняя) -> early: места/прокат освобождаются.
 * - < 24ч до старта -> late: места/прокат НЕ освобождаются, штрафов нет.
 * - Класс уже стартовал (start_at в прошлом или сейчас) -> not_allowed: отмена недоступна (UC-3 E1).
 */
export class CancellationPolicy {
  constructor(private readonly clock: Clock) {}

  evaluate(slotStartAt: Date): CancellationOutcome {
    const now = this.clock.now().getTime();
    const start = slotStartAt.getTime();

    if (start <= now) {
      return 'not_allowed';
    }

    const hoursUntilStart = (start - now) / (1000 * 60 * 60);

    return hoursUntilStart >= EARLY_CANCELLATION_THRESHOLD_HOURS ? 'early' : 'late';
  }
}
