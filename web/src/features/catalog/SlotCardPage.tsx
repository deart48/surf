// SCR-05 — Карточка класса. FR-5: все параметры слота.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDateTime, formatMoney } from '../../domain/policies';
import { getSlot } from '../../api/endpoints';
import type { Slot } from '../../api/types';
import { Button, Card, ErrorState, SlotStatusBadge, Spinner } from '../../shared/ui';

export function SlotCardPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!slotId) return;
    setSlot(null);
    setError(null);
    getSlot(slotId)
      .then(setSlot)
      .catch(() => setError('Не удалось загрузить карточку класса'));
  }

  useEffect(load, [slotId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!slot) return <Spinner label="Загружаем карточку класса…" />;

  const isCancelled = slot.status === 'cancelled';
  const isFull = slot.free_seats <= 0;
  const canBook = !isCancelled && !isFull;

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <Link to="/classes" className="text-sm text-ink-500 hover:text-terracotta-700">
        ← К списку классов
      </Link>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-ink-900">{slot.program.name}</h1>
            <p className="text-sm text-ink-500">
              {slot.program.type === 'novice' ? 'Новичковый уровень' : 'Для опытных'} · {slot.program.duration_min} мин
            </p>
          </div>
          <SlotStatusBadge status={slot.status} />
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-ink-500">Дата и время</dt>
            <dd className="font-medium text-ink-900">{formatDateTime(slot.start_at)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Шеф</dt>
            <dd className="font-medium text-ink-900">{slot.chef.name}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Цена за место</dt>
            <dd className="font-medium text-ink-900">{formatMoney(slot.price)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Прокат комплекта</dt>
            <dd className="font-medium text-ink-900">{formatMoney(slot.rental_price)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Свободно мест</dt>
            <dd className={`font-medium ${isFull ? 'text-danger-600' : 'text-olive-700'}`}>
              {slot.free_seats} из {slot.total_seats}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Прокатных комплектов</dt>
            <dd className="font-medium text-ink-900">{slot.free_rental_sets}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-ink-500">Адрес студии</dt>
            <dd className="font-medium text-ink-900">{slot.address}</dd>
          </div>
        </dl>

        {isCancelled && (
          <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
            Класс отменён студией. Повторная запись на этот слот недоступна.
          </p>
        )}
        {!isCancelled && isFull && (
          <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-700">Мест не осталось. Загляните позже — иногда появляются отмены.</p>
        )}
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-20 bg-cream-50/95 px-4 py-3 backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button
          className="w-full"
          disabled={!canBook}
          onClick={() => navigate(`/classes/${slot.id}/book`)}
        >
          {canBook ? 'Записаться' : 'Запись недоступна'}
        </Button>
      </div>
    </div>
  );
}
