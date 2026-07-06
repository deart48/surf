// SCR-01 — Вход: телефон. Валидация реальной корректности номера (libphonenumber-js),
// маска при вводе, проверка на blur и submit (AC-N01).
import type { FormEvent, FocusEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatPhoneInput,
  getPhoneValidationError,
  isValidPhone,
  normalizePhoneToE164,
  PHONE_FORMAT_ERROR,
} from '../../domain/policies';
import { ApiError, requestAuthCode } from '../../api/endpoints';
import { Button } from '../../shared/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('+7');
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = isValidPhone(phone) && !submitting;

  function validate(force = false): string | null {
    return getPhoneValidationError(phone, force);
  }

  function onPhoneChange(raw: string) {
    setPhone(formatPhoneInput(raw));
    if (touched) {
      setError(validate());
    }
  }

  function onPhoneBlur(_event: FocusEvent<HTMLInputElement>) {
    setTouched(true);
    setError(validate());
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);

    const validationError = validate(true);
    if (validationError) {
      setError(validationError);
      return;
    }

    const normalized = normalizePhoneToE164(phone);
    if (!normalized) {
      setError(PHONE_FORMAT_ERROR);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await requestAuthCode(normalized);
      navigate('/login/verify', { state: { phone: normalized } });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        setError(PHONE_FORMAT_ERROR);
      } else {
        setError(err instanceof ApiError ? err.message : 'Не удалось отправить код. Попробуйте ещё раз.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl text-terracotta-700">Шеф-стол</p>
          <p className="mt-2 text-sm text-ink-500">
            Тёплая кулинарная студия в лофте. Записывайтесь на классы без пароля — по номеру телефона.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">Телефон</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 999 123-45-67"
              className={`rounded-xl border bg-white px-4 py-3 text-base outline-none focus-visible:border-terracotta-600 ${
                error ? 'border-danger-500' : 'border-cream-200'
              }`}
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              onBlur={onPhoneBlur}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'phone-error' : 'phone-hint'}
            />
            {error ? (
              <span id="phone-error" role="alert" className="text-sm text-danger-600">
                {error}
              </span>
            ) : (
              <span id="phone-hint" className="text-xs text-ink-500">
                Пришлём одноразовый код для входа — пароль не нужен. И напомним о классе за 24 часа.
              </span>
            )}
          </label>

          <Button type="submit" disabled={!canSubmit} className="mt-2 w-full">
            {submitting ? 'Отправляем код…' : 'Получить код'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-500">
          Продолжая, вы соглашаетесь получить одноразовый код по SMS для входа.
        </p>
      </div>
    </div>
  );
}
