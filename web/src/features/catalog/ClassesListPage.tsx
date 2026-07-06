// SCR-03 — Список классов. FR-3 (дефолт 7 дней), LOGIC-007/LOGIC-008.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime, formatMoney } from '../../domain/policies';
import { listSlots } from '../../api/endpoints';
import type { Slot, SlotFilters } from '../../api/types';
import { Button, Card, EmptyState, ErrorState, Spinner } from '../../shared/ui';
import { FiltersSheet } from './FiltersSheet';

const PAGE_SIZE = 4;

function activeFilterCount(filters: SlotFilters): number {
  return (filters.program_type?.length ?? 0) + (filters.chef_id?.length ?? 0) + (filters.only_available ? 1 : 0);
}

export function ClassesListPage() {
  const [filters, setFilters] = useState<SlotFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function load() {
    setSlots(null);
    setError(null);
    listSlots(filters)
      .then((res) => setSlots(res.items))
      .catch(() => setError('Не удалось загрузить список классов'));
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink-900">Классы на неделю</h1>
          <p className="text-sm text-ink-500">Ближайшие 7 дней. Выберите класс и запишитесь за пару шагов.</p>
        </div>
        <Button variant="secondary" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
          Фильтры{activeFilterCount(filters) > 0 ? ` (${activeFilterCount(filters)})` : ''}
        </Button>
      </div>

      {slots === null && !error && <Spinner label="Загружаем классы…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {slots !== null && slots.length === 0 && (
        <EmptyState
          title="Пока нет доступных классов"
          hint="Попробуйте изменить фильтры или заглянуть позже."
          action={
            activeFilterCount(filters) > 0 ? (
              <Button variant="secondary" onClick={() => setFilters({})}>
                Сбросить фильтры
              </Button>
            ) : undefined
          }
        />
      )}

      {slots !== null && slots.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {slots.slice(0, visibleCount).map((slot) => (
              <li key={slot.id}>
                <Link to={`/classes/${slot.id}`}>
                  <Card className="transition hover:border-terracotta-500">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg text-ink-900">{slot.program.name}</p>
                        <p className="text-sm text-ink-500">{formatDateTime(slot.start_at)} · Шеф {slot.chef.name}</p>
                      </div>
                      <span className="whitespace-nowrap font-semibold text-terracotta-700">{formatMoney(slot.price)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className={slot.free_seats > 0 ? 'text-olive-700' : 'text-danger-600'}>
                        {slot.free_seats > 0 ? `Свободно мест: ${slot.free_seats}` : 'Мест нет'}
                      </span>
                      <span className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                        {slot.program.type === 'novice' ? 'Новичковый' : 'Опытный'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {visibleCount < slots.length && (
            <Button variant="secondary" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="self-center">
              Показать ещё
            </Button>
          )}
        </>
      )}

      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} onApply={setFilters} />
    </div>
  );
}
