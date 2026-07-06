import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { BookingStatus, SlotStatus } from '../api/types';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2';
  const variants: Record<string, string> = {
    primary: 'bg-terracotta-600 text-cream-50 hover:bg-terracotta-700 shadow-sm',
    secondary: 'bg-cream-100 text-ink-900 border border-cream-200 hover:bg-cream-200',
    ghost: 'bg-transparent text-ink-700 hover:bg-cream-100',
    danger: 'bg-danger-500 text-cream-50 hover:bg-danger-600',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-2xl border border-cream-200 bg-white/70 p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-500" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream-200 border-t-terracotta-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-cream-200 px-6 py-16 text-center">
      <p className="text-lg font-display text-ink-900">{title}</p>
      {hint && <p className="text-sm text-ink-500">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger-500/30 bg-danger-500/5 px-6 py-10 text-center">
      <p className="text-sm font-medium text-danger-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

const slotStatusLabels: Record<SlotStatus, { label: string; className: string }> = {
  scheduled: { label: 'Запланирован', className: 'bg-olive-600/10 text-olive-700' },
  cancelled: { label: 'Класс отменён студией', className: 'bg-danger-500/10 text-danger-600' },
};

export function SlotStatusBadge({ status }: { status: SlotStatus }) {
  const info = slotStatusLabels[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>
      <span aria-hidden>●</span>
      {info.label}
    </span>
  );
}

const bookingStatusLabels: Record<BookingStatus, { label: string; className: string; icon: string }> = {
  active: { label: 'Активна', className: 'bg-olive-600/10 text-olive-700', icon: '✓' },
  cancelled: { label: 'Отменена', className: 'bg-ink-500/10 text-ink-700', icon: '↺' },
  late_cancel: { label: 'Поздняя отмена', className: 'bg-terracotta-600/10 text-terracotta-700', icon: '!' },
  studio_cancelled: { label: 'Отменён студией', className: 'bg-danger-500/10 text-danger-600', icon: '⚠' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const info = bookingStatusLabels[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${info.className}`}>
      <span aria-hidden>{info.icon}</span>
      {info.label}
    </span>
  );
}

export function Counter({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink-700">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Уменьшить: ${label}`}
          className="h-9 w-9 rounded-full border border-cream-200 text-lg font-semibold text-ink-900 disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Увеличить: ${label}`}
          className="h-9 w-9 rounded-full border border-cream-200 text-lg font-semibold text-ink-900 disabled:opacity-30"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Модалка/bottom-sheet с фокус-ловушкой и Esc (design-brief §9: адаптив + a11y).
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; footer?: ReactNode }>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 p-6 shadow-xl sm:max-w-md sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink-900">{title}</h2>
          <button aria-label="Закрыть" className="text-ink-500 hover:text-ink-900" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
