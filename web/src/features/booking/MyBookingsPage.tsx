// SCR-08 — Мои бронирования. LOGIC-006: группировка предстоящие/история по slot.start_at.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime, formatMoney, isPast } from '../../domain/policies';
import { listBookings } from '../../api/endpoints';
import type { Booking } from '../../api/types';
import { BookingStatusBadge, Card, EmptyState, ErrorState, Spinner } from '../../shared/ui';

type Tab = 'upcoming' | 'history';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');

  function load() {
    setBookings(null);
    setError(null);
    listBookings()
      .then(setBookings)
      .catch(() => setError('Не удалось загрузить бронирования'));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!bookings) return <Spinner label="Загружаем брони…" />;

  // «Прошедшая» — производный признак от slot.start_at, не статус (data-model.md).
  const upcoming = bookings.filter((b) => !isPast(b.slot.start_at) && b.status === 'active');
  const history = bookings.filter((b) => isPast(b.slot.start_at) || b.status !== 'active');
  const items = tab === 'upcoming' ? upcoming : history;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink-900">Мои бронирования</h1>

      <div className="flex gap-2 rounded-full bg-cream-100 p-1">
        {(['upcoming', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-white text-terracotta-700 shadow-sm' : 'text-ink-500'
            }`}
          >
            {t === 'upcoming' ? `Предстоящие (${upcoming.length})` : `История (${history.length})`}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <EmptyState
          title={tab === 'upcoming' ? 'Пока нет предстоящих записей' : 'История пуста'}
          hint={tab === 'upcoming' ? 'Загляните в «Классы», чтобы выбрать что-то по душе.' : undefined}
        />
      )}

      <ul className="flex flex-col gap-3">
        {items.map((booking) => (
          <li key={booking.id}>
            <Link to={`/bookings/${booking.id}`}>
              <Card className="hover:border-terracotta-500">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-ink-900">{booking.slot.program.name}</p>
                    <p className="text-sm text-ink-500">{formatDateTime(booking.slot.start_at)}</p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-ink-700">
                  <span>
                    {booking.seats_count} мест{booking.rental_count > 0 ? ` · прокат ×${booking.rental_count}` : ''}
                  </span>
                  <span className="font-semibold text-terracotta-700">{formatMoney(booking.price_total)}</span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
