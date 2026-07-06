# Баг-репорт — web «Шеф-стол»

> Основание: сверка `web/` с ТЗ по результатам [`requirements-impact-review.md`](requirements-impact-review.md)  
> Метод: статический code review + domain unit-тесты backend (18/18 passed)  
> Дата: 2026-07-06  
> Live E2E не выполнялся: backend/PostgreSQL недоступны в среде проверки (Docker down)

## Сводка

| ID | Severity | Краткое описание | Статус |
| :-- | :--: | :-- | :-- |
| BUG-001 | medium | `reminder_hours` захардкожен на SCR-07 / SCR-10 | open |
| BUG-002 | medium | Таймер resend OTP игнорирует `resend_after_seconds` из API | open |
| BUG-003 | medium | Выключение push в профиле не вызывает `deletePushToken` | open |
| BUG-004 | low | Некорректный `seatsCount` при `free_seats = 0` | open |
| BUG-005 | low | Прямой URL `/classes/{id}/book` обходит guard SCR-05 | open |

---

## BUG-001 — `reminder_hours` захардкожен вместо значения с сервера

| | |
| :-- | :-- |
| **Severity** | medium |
| **Трассировка** | LOGIC-009 AC-005, SCR-07 AC-005, FR-19 |
| **Файлы** | `web/src/features/booking/BookingSuccessPage.tsx:59-64,70`; `web/src/features/profile/ProfilePage.tsx:94` |

### Описание

На экране успеха (SCR-07) и в профиле (SCR-10) текст push-напоминания всегда содержит «24 часа», хотя API возвращает `reminder_hours` в объекте брони (например `[24]`). При изменении политики напоминаний на backend UI покажет неверный интервал без релиза клиента — нарушение LOGIC-009 («значение не хардкодится»).

### Шаги воспроизведения

1. Авторизоваться, оформить бронь.
2. На SCR-07 проверить текст «Хотите получить напоминание за 24 часа…».
3. Сравнить с `GET /bookings/{id}` → поле `reminder_hours`.

### Ожидаемое поведение

Текст формируется из `booking.reminder_hours` (напр. «Напомним за 24 часа» при `[24]`).

### Фактическое поведение

Строка «24 часа» зашита в JSX; поле `reminder_hours` из типа `Booking` не используется.

### Рекомендация

```typescript
function formatReminderHours(hours: number[]): string {
  if (!hours.length) return '';
  return hours.map((h) => `${h} ч`).join(', ');
}
// Использовать booking.reminder_hours на SCR-07 и в ProfilePage
```

---

## BUG-002 — Таймер повторной отправки OTP игнорирует API (LOGIC-001)

| | |
| :-- | :-- |
| **Severity** | medium |
| **Трассировка** | LOGIC-001, SCR-02 |
| **Файлы** | `web/src/features/auth/OtpPage.tsx:9-10,109-112`; `web/src/features/auth/LoginPage.tsx:60-61` |

### Описание

`OtpPage` использует константу `RESEND_SECONDS = 60`. Ответ `POST /auth/request-code` содержит `resend_after_seconds`, но:

1. `LoginPage` не передаёт значение в navigation state.
2. `OtpPage` инициализирует таймер из константы.
3. `onResend()` снова сбрасывает таймер на 60, не читая ответ API.

При `OTP_RESEND_AFTER_SECONDS=120` на backend UI покажет 60 сек — расхождение с контрактом и риск 429 при раннем resend.

### Шаги воспроизведения

1. Задать в backend `.env`: `OTP_RESEND_AFTER_SECONDS=120`.
2. Запросить код на SCR-01.
3. На SCR-02 проверить таймер кнопки «Отправить код повторно».

### Ожидаемое поведение

Таймер = `resend_after_seconds` из ответа `requestAuthCode`.

### Фактическое поведение

Всегда 60 секунд.

### Рекомендация

Передавать `resend_after_seconds` из `LoginPage` в `location.state`; в `onResend` обновлять таймер из ответа API.

---

## BUG-003 — Выключение push в профиле не вызывает `deletePushToken`

| | |
| :-- | :-- |
| **Severity** | medium |
| **Трассировка** | LOGIC-009 (очистка push при logout/отключении) |
| **Файлы** | `web/src/features/profile/ProfilePage.tsx:38-44`; `web/src/api/endpoints.ts` (нет `deletePushToken`) |

### Описание

При включении push вызывается `registerPushTokenMock()` → `POST /auth/push-tokens`. При выключении toggle выполняется только `setPushEnabled(false)` — локальный state. Токен остаётся на сервере; клиент продолжит получать push после «отключения» в UI.

### Шаги воспроизведения

1. Профиль → включить push (Allow в браузере).
2. Выключить toggle «Напоминания о классах».
3. Проверить записи push-токенов на backend.

### Ожидаемое поведение

`DELETE /auth/push-tokens` (или эквивалент по OpenAPI) при выключении toggle и при logout.

### Фактическое поведение

Toggle OFF меняет только UI; API delete не вызывается.

### Рекомендация

Добавить `deletePushToken()` в `endpoints.ts`; вызывать из `onTogglePush` и при logout (LOGIC-002 ∩ LOGIC-009).

---

## BUG-004 — Некорректный начальный `seatsCount` при нулевых местах

| | |
| :-- | :-- |
| **Severity** | low |
| **Трассировка** | SCR-06, LOGIC-003 |
| **Файлы** | `web/src/features/booking/BookingFormPage.tsx:38` |

### Описание

При загрузке слота:

```typescript
setSeatsCount(Math.min(1, maxBookableSeats(data)) || 1);
```

Если `maxBookableSeats(data) === 0`: `Math.min(1, 0) = 0`, затем `0 || 1 = 1`. Counter показывает `value=1` при `max=0` — некорректное начальное состояние; submit уйдёт с `seats_count=1` и вернёт 409.

### Шаги воспроизведения

1. Открыть `/classes/{slotId}/book` для слота с `free_seats = 0` (прямой URL).
2. Проверить значение counter «Мест».

### Ожидаемое поведение

`seatsCount = 0` или форма недоступна / redirect (как на SCR-05).

### Рекомендация

Заменить на `setSeatsCount(Math.min(1, max) || 0)` и блокировать submit при `maxSeats === 0`; либо guard как на SCR-05.

---

## BUG-005 — Прямой URL обходит guard «Запись недоступна» (SCR-05)

| | |
| :-- | :-- |
| **Severity** | low |
| **Трассировка** | SCR-05, SCR-06 |
| **Файлы** | `web/src/features/catalog/SlotCardPage.tsx:29-31,96-97`; `web/src/features/booking/BookingFormPage.tsx` |

### Описание

На SCR-05 CTA «Записаться» disabled при `status=cancelled` или `free_seats <= 0`. Но маршрут `/classes/:slotId/book` доступен напрямую — форма SCR-06 открывается без проверки `canBook`. Ошибка видна только после submit (409/410).

### Шаги воспроизведения

1. Взять ID отменённого или заполненного слота.
2. Перейти на `/classes/{slotId}/book`.
3. Форма отображается; CTA «Подтвердить» active.

### Ожидаемое поведение

Redirect на SCR-05 с сообщением или disabled-форма сразу при загрузке.

### Рекомендация

После `getSlot` проверять `status` и `free_seats`; при `!canBook` — redirect или read-only состояние.

---

## Связанные артефакты

- [Тест-кейсы](test-cases.md) — TC-PUSH-01/03, TC-AUTH-07 покрывают BUG-001…003
- [Проверка «≥ 3 фичи»](feature-implementation-check.md)
- [Ревью требований](requirements-impact-review.md) — §3 code-level расхождения
