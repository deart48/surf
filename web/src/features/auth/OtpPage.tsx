// SCR-02 — Подтверждение OTP. LOGIC-001: таймер повторной отправки.
import type { ClipboardEvent, FormEvent, KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../app/SessionContext';
import { ApiError, requestAuthCode, updateProfile, verifyAuthCode } from '../../api/endpoints';
import { Button } from '../../shared/ui';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

export function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { markAuthenticated } = useSession();
  const phone = (location.state as { phone?: string } | null)?.phone ?? '';

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!phone) navigate('/login', { replace: true });
  }, [phone, navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function updateDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function verify(code: string) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyAuthCode(phone, code);
      if (result.is_new) {
        setIsNew(true);
      } else {
        markAuthenticated();
        navigate('/classes', { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Неверный код. Попробуйте ещё раз.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setError(`Введите ${CODE_LENGTH}-значный код`);
      return;
    }
    verify(code);
  }

  async function onSubmitName(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await updateProfile(name.trim());
      markAuthenticated();
      navigate('/classes', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сохранить имя. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    try {
      await requestAuthCode(phone);
      setSecondsLeft(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить код повторно.');
    }
  }

  if (isNew) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
        <form onSubmit={onSubmitName} className="w-full max-w-sm">
          <p className="mb-1 font-display text-2xl text-ink-900">Как к вам обращаться?</p>
          <p className="mb-6 text-sm text-ink-500">Это последний шаг — укажите имя, и мы вас запомним.</p>
          <input
            autoFocus
            className="w-full rounded-xl border border-cream-200 bg-white px-4 py-3 text-base outline-none focus-visible:border-terracotta-600"
            placeholder="Иван"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger-600">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !name.trim()} className="mt-4 w-full">
            Продолжить
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm" noValidate>
        <p className="mb-1 font-display text-2xl text-ink-900">Введите код из SMS</p>
        <p className="mb-6 text-sm text-ink-500">Отправили одноразовый код на {phone || 'ваш номер'}.</p>

        <div className="flex justify-between gap-2" role="group" aria-label="Код подтверждения">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              onPaste={onPaste}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Цифра ${index + 1}`}
              className="h-14 w-14 rounded-xl border border-cream-200 bg-white text-center text-xl font-semibold outline-none focus-visible:border-terracotta-600"
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} className="mt-6 w-full">
          {submitting ? 'Проверяем…' : 'Подтвердить'}
        </Button>

        <button
          type="button"
          disabled={secondsLeft > 0}
          onClick={onResend}
          className="mt-4 w-full text-center text-sm font-medium text-terracotta-700 disabled:text-ink-500"
        >
          {secondsLeft > 0 ? `Отправить код повторно через ${secondsLeft}с` : 'Отправить код повторно'}
        </button>

        <p className="mt-6 text-center text-xs text-ink-500">Подсказка для mock-режима: код 0000 — неверный, любой другой — верный.</p>
      </form>
    </div>
  );
}
