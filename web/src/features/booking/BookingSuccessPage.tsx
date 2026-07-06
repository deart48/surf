// SCR-07 — Запись создана. LOGIC-009 (push, best-effort mock).
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDateTime, formatMoney } from '../../domain/policies';
import { getBooking, registerPushTokenMock } from '../../api/endpoints';
import type { Booking } from '../../api/types';
import { Button, Card, ErrorState, Spinner } from '../../shared/ui';

export function BookingSuccessPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushState, setPushState] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!bookingId) return;
    getBooking(bookingId)
      .then(setBooking)
      .catch(() => setError('Не удалось загрузить данные брони'));
  }, [bookingId]);

  async function onEnablePush() {
    const result = await registerPushTokenMock();
    if (typeof Notification === 'undefined') setPushState('unsupported');
    else setPushState(result.granted ? 'granted' : 'denied');
  }

  if (error) return <ErrorState message={error} />;
  if (!booking) return <Spinner label="Оформляем подтверждение…" />;

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-olive-600/10 text-3xl">✓</div>
      <div>
        <h1 className="font-display text-2xl text-ink-900">Запись подтверждена!</h1>
        {booking.is_first_booking && <p className="mt-1 text-sm text-ink-500">Это ваша первая запись в «Шеф-стол» — до встречи на кухне!</p>}
      </div>

      <Card className="w-full max-w-sm text-left">
        <p className="font-display text-lg text-ink-900">{booking.slot.program.name}</p>
        <p className="text-sm text-ink-500">{formatDateTime(booking.slot.start_at)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-500">Мест</dt>
            <dd className="font-medium text-ink-900">{booking.seats_count}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Прокат</dt>
            <dd className="font-medium text-ink-900">{booking.rental_count}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-ink-500">Итого (оплата офлайн, на месте)</dt>
            <dd className="font-display text-lg text-terracotta-700">{formatMoney(booking.price_total)}</dd>
          </div>
        </dl>
      </Card>

      <p className="max-w-sm text-xs text-ink-500">
        Напоминаем: бесплатная отмена возможна не позднее чем за 24 часа до начала класса.
      </p>

      {pushState === 'idle' && (
        <Card className="w-full max-w-sm">
          <p className="mb-3 text-sm text-ink-700">Хотите получить напоминание за 24 часа до класса?</p>
          <Button variant="secondary" className="w-full" onClick={onEnablePush}>
            Включить уведомления
          </Button>
        </Card>
      )}
      {pushState === 'granted' && <p className="text-sm text-olive-700">Готово — напомним за 24 часа до старта.</p>}
      {pushState === 'denied' && <p className="text-sm text-ink-500">Без уведомлений — бронь всё равно видна в «Моих бронированиях».</p>}
      {pushState === 'unsupported' && <p className="text-sm text-ink-500">Этот браузер не поддерживает уведомления, но бронь сохранена.</p>}

      <div className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
        <Link to="/bookings" className="flex-1">
          <Button variant="secondary" className="w-full">
            Мои бронирования
          </Button>
        </Link>
        <Link to="/classes" className="flex-1">
          <Button className="w-full">К классам</Button>
        </Link>
      </div>
    </div>
  );
}
