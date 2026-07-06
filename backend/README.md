# Backend API (NestJS)

REST API для клиентского web-приложения «Шеф-стол». Реализация следует OpenAPI из `../01-analysis/api` и чек-листу `../02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md`.

## Стек

- NestJS 11, TypeScript, Node.js 22+
- Prisma + PostgreSQL 16
- JWT access-токен + opaque refresh-токен (bcrypt hash в БД), phone/OTP auth
- Jest (доменные unit-тесты); e2e/интеграционные тесты — TODO

## Требования

- Node.js 22 LTS
- PostgreSQL 16 (Docker Compose рекомендуется)
- npm dependencies для OpenAPI lint: `npm --prefix ../01-analysis/api install`

## Запуск

```bash
npm install
cp .env.example .env

# PostgreSQL
docker compose --profile db up -d db

npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

`GET /healthz` и `GET /readyz` — служебные endpoints вне клиентского OpenAPI-контракта.

## Команды

```bash
npm run build        # nest build
npm run start:dev    # dev-сервер с watch
npm run lint         # eslint (flat config, eslint.config.mjs)
npm test             # jest — сейчас только src/domain/*.spec.ts
npx prisma generate  # сгенерировать @prisma/client
npx prisma migrate dev
```

## Структура

```text
src/
  main.ts, app.module.ts
  common/
    errors/api-error.ts            # контрактные ошибки { code, message, details? }
    filters/http-exception.filter.ts
    guards/jwt-auth.guard.ts
    decorators/current-client.decorator.ts, idempotency-key.decorator.ts
  domain/                          # чистые политики, без Nest/Prisma импортов
    clock.ts, cancellation.policy.ts, booking-limits.ts, price-calculator.ts
    *.spec.ts                      # unit-тесты — зелёные, не требуют БД
  infrastructure/
    prisma/prisma.service.ts, prisma.module.ts
    clock/clock.module.ts
  modules/
    auth/       # requestAuthCode, verifyAuthCode, refresh, logout, push-tokens
    profile/    # getProfile, updateProfile
    catalog/    # listChefs, listPrograms (read-only)
    slots/      # listSlots, getSlot (read-only)
    bookings/   # createBooking, listBookings, getBooking, cancelBooking
    health/     # healthz, readyz
prisma/
  schema.prisma, migrations/, seed.ts
```

## CORS

`main.ts` включает CORS для web-клиента (`../web`, другой порт dev-сервера). По умолчанию
разрешён любой origin; в проде сузить через `CORS_ORIGIN=https://example.com,https://foo.bar`
(список через запятую).

## Исправление контрактного маппинга (сессия подключения web-клиента к сети)

`SlotsService`, `CatalogService`, `ProfileService` изначально возвращали «сырые» Prisma-объекты
(camelCase: `startAt`, `totalSeats`, `durationMin`...), что не соответствовало OpenAPI-контракту
(snake_case: `start_at`, `total_seats`, `duration_min`...). Добавлен явный DTO-маппинг —
`src/common/mappers/{catalog,slot,client}.mapper.ts` — по аналогии с уже существовавшим
`BookingsService#toBookingDto`; `BookingsService` тоже обновлён, чтобы вложенный `booking.slot`
маппился через тот же `toSlotDto`. Без этой правки web-клиент (написанный строго по контракту)
получал бы `undefined` в полях вида `slot.start_at`.

## Известное ограничение

В среде разработки этой сессии не было доступной PostgreSQL (Docker и понижение привилегий заблокированы в sandbox), поэтому:

- ✅ Проверено: `tsc --noEmit`, `nest build`, `eslint`, доменные unit-тесты (18/18).
- ❌ Не проверено живым запуском: `prisma migrate dev`/`db seed`, старт сервера, любые запросы к endpoints (включая маппинг из раздела выше — статически вычитан построчно, но не прогнан против реального ответа), concurrency-тест на брони, e2e, k6.

Перед продакшен-использованием обязательно прогнать полный цикл на реальной PostgreSQL (см. чек-лист).

Пошаговая инструкция, что именно доделать и как проверить готовность каждого пункта — в [NEXT_STEPS.md](NEXT_STEPS.md).

См. [BACKEND_IMPLEMENTATION_CHECKLIST.md](../02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md) и [BE_IMPLEMENTATION_PLAN.md](../02-development/BE_IMPLEMENTATION_PLAN.md).
