// SCR-09 — Детали брони и отмена. LOGIC-005: правило 24ч.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDateTime, formatMoney, getCancellationInfo } from '../../domain/policies';
import { ApiError, cancelBooking, getBooking } from '../../api/endpoints';
import type { Booking } from '../../api/types';
import { BookingStatusBadge, Button, Card, ErrorState, Modal, Spinner } from '../../shared/ui';

export function BookingDetailsPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function load() {
    if (!bookingId) return;
    setBooking(null);
    setError(null);
    getBooking(bookingId)
      .then(setBooking)
      .catch(() => setError('Не удалось загрузить бронь'));
  }

  useEffect(load, [bookingId]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!booking) return <Spinner label="Загружаем детали брони…" />;

  const cancellation = getCancellationInfo(booking.slot.start_at);
  const canCancel = booking.status === 'active' && cancellation.canCancel;

  async function onConfirmCancel() {
    if (!booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelBooking(booking.id);
      setBooking(updated);
      setConfirmOpen(false);
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'Не удалось отменить бронь. Попробуйте ещё раз.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <Link to="/bookings" className="text-sm text-ink-500 hover:text-terracotta-700">
        ← Мои бронирования
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-900">Детали брони</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <p className="font-display text-lg text-ink-900">{booking.slot.program.name}</p>
          <p className="text-sm text-ink-500">{formatDateTime(booking.slot.start_at)} · Шеф {booking.slot.chef.name}</p>
          <p className="text-sm text-ink-500">{booking.slot.address}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-500">Мест</dt>
            <dd className="font-medium text-ink-900">{booking.seats_count}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Прокат</dt>
            <dd className="font-medium text-ink-900">{booking.rental_count}</dd>
          </div>
          {booking.allergies && (
            <div className="col-span-2">
              <dt className="text-ink-500">Аллергии</dt>
              <dd className="font-medium text-ink-900">{booking.allergies}</dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="text-ink-500">Итого (оплата офлайн)</dt>
            <dd className="font-display text-lg text-terracotta-700">{formatMoney(booking.price_total)}</dd>
          </div>
        </dl>

        {booking.status === 'studio_cancelled' && booking.cancel_reason && (
          <p className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-600">
            Класс отменён студией. Причина: {booking.cancel_reason}
          </p>
        )}
        {booking.status === 'late_cancel' && (
          <p className="rounded-xl bg-terracotta-600/10 px-4 py-3 text-sm text-terracotta-700">
            Поздняя отмена (менее 24 ч до старта) — место и прокат не были освобождены, штрафов нет.
          </p>
        )}
        {booking.status === 'cancelled' && (
          <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-ink-700">Бронь отменена заранее — место и прокат возвращены в слот.</p>
        )}
      </Card>

      {canCancel && (
        <div className="fixed inset-x-0 bottom-16 z-20 bg-cream-50/95 px-4 py-3 backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button variant="danger" className="w-full" onClick={() => setConfirmOpen(true)}>
            Отменить запись
          </Button>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Отменить запись?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Не отменять
            </Button>
            <Button variant="danger" disabled={cancelling} onClick={onConfirmCancel}>
              {cancelling ? 'Отменяем…' : 'Да, отменить'}
            </Button>
          </>
        }
      >
        {cancellation.isEarly ? (
          <p className="text-sm text-ink-700">
            До класса ещё {Math.round(cancellation.hoursUntilStart)} ч — это ранняя отмена, место и прокатный комплект
            вернутся в слот, без штрафов.
          </p>
        ) : (
          <p className="text-sm text-ink-700">
            До класса меньше 24 часов — это <strong>поздняя отмена</strong>. Место и прокат уже не освободятся (продукты
            закуплены), но денежных штрафов нет.
          </p>
        )}
        {cancelError && (
          <p role="alert" className="mt-3 text-sm text-danger-600">
            {cancelError}
          </p>
        )}
      </Modal>
    </div>
  );
}
