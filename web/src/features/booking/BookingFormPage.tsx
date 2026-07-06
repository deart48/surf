// SCR-06 — Оформление записи. LOGIC-003 (живой пересчёт), LOGIC-004 (идемпотентность через
// заголовок Idempotency-Key на реальном POST /bookings).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  calculatePriceTotal,
  formatDateTime,
  formatMoney,
  maxBookableRentalSets,
  maxBookableSeats,
} from '../../domain/policies';
import { ApiError, createBooking, getSlot } from '../../api/endpoints';
import type { Slot } from '../../api/types';
import { Button, Card, Counter, ErrorState, Spinner } from '../../shared/ui';

export function BookingFormPage() {
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();

  const [slot, setSlot] = useState<Slot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seatsCount, setSeatsCount] = useState(1);
  const [rentalCount, setRentalCount] = useState(0);
  const [allergies, setAllergies] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Один ключ на попытку записи данного пользователя на данный слот: повторный клик
  // «Подтвердить» (после сетевой ошибки) переиспользует тот же ключ — LOGIC-004.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function load() {
    if (!slotId) return;
    setSlot(null);
    setLoadError(null);
    getSlot(slotId)
      .then((data) => {
        setSlot(data);
        setSeatsCount(Math.min(1, maxBookableSeats(data)) || 1);
      })
      .catch(() => setLoadError('Не удалось загрузить данные класса'));
  }

  useEffect(load, [slotId]);

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!slot) return <Spinner label="Готовим форму записи…" />;

  const maxSeats = maxBookableSeats(slot);
  const maxRental = maxBookableRentalSets(slot, seatsCount);
  const priceTotal = calculatePriceTotal(slot, seatsCount, rentalCount);

  async function onSubmit() {
    if (!slot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking(
        {
          slot_id: slot.id,
          seats_count: seatsCount,
          rental_count: rentalCount,
          allergies: allergies.trim() || null,
        },
        idempotencyKey,
      );
      navigate(`/bookings/${booking.id}/success`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'SLOT_CANCELLED') {
          setSubmitError('Класс отменён студией. Повторная запись недоступна.');
        } else {
          setSubmitError(error.message);
          load(); // подтянуть актуальные free_seats / free_rental_sets (409)
        }
      } else {
        setSubmitError('Не удалось оформить запись. Проверьте соединение и попробуйте ещё раз.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-28 sm:pb-0">
      <Link to={`/classes/${slot.id}`} className="text-sm text-ink-500 hover:text-terracotta-700">
        ← К карточке класса
      </Link>

      <h1 className="font-display text-2xl text-ink-900">Оформление записи</h1>
      <p className="text-sm text-ink-500">
        {slot.program.name} · {formatDateTime(slot.start_at)}
      </p>

      <Card className="flex flex-col gap-5">
        <Counter
          label="Мест (вы + гости, один стол)"
          value={seatsCount}
          min={1}
          max={maxSeats}
          onChange={(next) => {
            setSeatsCount(next);
            setRentalCount((prev) => Math.min(prev, maxBookableRentalSets(slot, next)));
          }}
        />
        <Counter
          label="Прокатных комплектов (фартук + ножи)"
          value={rentalCount}
          min={0}
          max={maxRental}
          onChange={setRentalCount}
        />
        {maxRental === 0 && (
          <p className="text-xs text-ink-500">Прокатных комплектов на этот стол не осталось — можно прийти со своей экипировкой.</p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-700">Аллергии (опционально)</span>
          <textarea
            className="min-h-20 rounded-xl border border-cream-200 bg-white px-4 py-3 text-sm outline-none focus-visible:border-terracotta-600"
            maxLength={500}
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Например: орехи, лактоза"
          />
        </label>
      </Card>

      <Card className="flex items-center justify-between">
        <span className="text-sm text-ink-700">Итого (оплата офлайн)</span>
        <span className="font-display text-xl text-terracotta-700">{formatMoney(priceTotal)}</span>
      </Card>

      {submitError && (
        <p role="alert" className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
          {submitError}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-20 bg-cream-50/95 px-4 py-3 backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button className="w-full" disabled={submitting} onClick={onSubmit}>
          {submitting ? 'Оформляем…' : `Подтвердить запись · ${formatMoney(priceTotal)}`}
        </Button>
      </div>
    </div>
  );
}
