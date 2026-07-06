# План реализации BE для «Шеф-стол» (NestJS)

## TOC / Todo реализации

- [ ] [BE-00. Создать каркас NestJS-приложения](#be-00-создать-каркас-nestjs-приложения)
- [ ] [BE-01. Подключить OpenAPI как контракт](#be-01-подключить-openapi-как-контракт)
- [ ] [BE-02. Реализовать общую HTTP-инфраструктуру](#be-02-реализовать-общую-http-инфраструктуру)
- [ ] [BE-03. Спроектировать БД и миграции (Prisma)](#be-03-спроектировать-бд-и-миграции-prisma)
- [ ] [BE-04. Реализовать Auth: OTP, refresh и push-токены](#be-04-реализовать-auth-otp-refresh-и-push-токены)
- [ ] [BE-05. Реализовать Profile](#be-05-реализовать-profile)
- [ ] [BE-06. Реализовать read-only каталог: слоты, программы, шефы](#be-06-реализовать-read-only-каталог-слоты-программы-шефы)
- [ ] [BE-07. Реализовать атомарное создание брони](#be-07-реализовать-атомарное-создание-брони)
- [ ] [BE-08. Реализовать список и детали броней](#be-08-реализовать-список-и-детали-броней)
- [ ] [BE-09. Реализовать отмену брони (правило 24 ч)](#be-09-реализовать-отмену-брони-правило-24-ч)
- [ ] [BE-10. Довести контрактные ошибки и валидацию](#be-10-довести-контрактные-ошибки-и-валидацию)
- [ ] [BE-11. Добавить полный набор тестов](#be-11-добавить-полный-набор-тестов)
- [ ] [BE-12. Добавить k6 performance tests до 300 concurrent users](#be-12-добавить-k6-performance-tests-до-300-concurrent-users)
- [ ] [BE-13. Подготовить локальный запуск и документацию разработчика](#be-13-подготовить-локальный-запуск-и-документацию-разработчика)
- [ ] [BE-14. Финальная проверка готовности BE](#be-14-финальная-проверка-готовности-be)

## Стек приложения

- **Runtime:** Node.js 22 LTS, TypeScript 5+.
- **Framework:** NestJS 11 (модули, DI, guards, pipes, filters).
- **HTTP:** встроенный Express adapter (по умолчанию Nest); Fastify adapter — опционально позже.
- **API:** RESTful JSON, OpenAPI-first; контракты из `01-analysis/api/redocly.yaml`.
- **Валидация:** `class-validator` + `class-transformer` на DTO; `ValidationPipe` глобально.
- **ORM / БД:** Prisma + PostgreSQL 16; транзакции `$transaction`, row lock через `$queryRaw` при create/cancel booking.
- **Auth:** `@nestjs/jwt`, `@nestjs/passport`; phone/OTP flow; access + refresh token rotation.
- **Конфиг:** `@nestjs/config` + `.env`; валидация env через Zod или class-validator.
- **Логи:** `nestjs-pino` / `pino` (structured, request id).
- **OpenAPI на BE:** DTO вручную по контракту **или** codegen типов из bundle (`openapi-typescript` в shared package); Swagger UI опционально, не заменяет `01-analysis/api`.
- **Тесты:** Jest (Nest default) + supertest e2e; testcontainers для PostgreSQL; concurrency tests для booking.
- **Нагрузка:** k6 до 300 concurrent users.
- **Runtime:** Docker Compose (api + postgres), `prisma migrate`, `prisma db seed`.

## Целевая структура `backend/`

```text
backend/
  package.json
  nest-cli.json
  tsconfig.json
  prisma/
    schema.prisma
    migrations/
    seed.ts
  src/
    main.ts
    app.module.ts
    common/
      filters/          # HttpExceptionFilter → { code, message, details }
      guards/           # JwtAuthGuard
      interceptors/     # RequestId, IdempotencyKey
      pipes/
    domain/
      cancellation.policy.ts
      booking-limits.ts
      price-calculator.ts
    infrastructure/
      prisma/
      otp/
      clock/
    modules/
      auth/
        auth.controller.ts
        auth.service.ts
        auth.module.ts
        dto/
      profile/
      catalog/
      slots/
      bookings/
  test/
    e2e/
    concurrency/
```

## Функционал и endpoints

| Домен | operationId | Endpoint | Nest module |
|---|---|---|---|
| Auth | `requestAuthCode` | `POST /auth/request-code` | `AuthModule` |
| Auth | `verifyAuthCode` | `POST /auth/verify-code` | `AuthModule` |
| Auth | `refreshToken` | `POST /auth/refresh` | `AuthModule` |
| Auth | `logout` | `POST /auth/logout` | `AuthModule` |
| Auth | `registerPushToken` | `POST /auth/push-tokens` | `AuthModule` |
| Auth | `deletePushToken` | `DELETE /auth/push-tokens` | `AuthModule` |
| Profile | `getProfile` | `GET /profile` | `ProfileModule` |
| Profile | `updateProfile` | `PATCH /profile` | `ProfileModule` |
| Catalog | `listChefs` | `GET /chefs` | `CatalogModule` |
| Catalog | `listPrograms` | `GET /programs` | `CatalogModule` |
| Slots | `listSlots` | `GET /slots` | `SlotsModule` |
| Slots | `getSlot` | `GET /slots/:slotId` | `SlotsModule` |
| Bookings | `createBooking` | `POST /bookings` | `BookingsModule` |
| Bookings | `listBookings` | `GET /bookings` | `BookingsModule` |
| Bookings | `getBooking` | `GET /bookings/:bookingId` | `BookingsModule` |
| Bookings | `cancelBooking` | `POST /bookings/:bookingId/cancel` | `BookingsModule` |

Служебные endpoints (вне OpenAPI): `GET /healthz`, `GET /readyz` — `HealthModule` или `@nestjs/terminus`.

## Правила для итеративной разработки

- Один пункт ниже = одна итерация: минимальный вертикальный срез, тесты, прогон проверки.
- Любое изменение публичного API начинается с правки `01-analysis/api/*` и `npm --prefix 01-analysis/api run lint`.
- Не добавлять chef/owner/admin UI/API, schedule CRUD, slot creation/editing, online payment, ratings, loyalty, no-show.
- Бизнес-правила — в `Service` + `src/domain/`, не в `Controller` и не только в Prisma schema.

## Декомпозиция BE

### BE-00. Создать каркас NestJS-приложения

Сделать:
- `nest new backend` (или scaffold в существующую папку `backend/`).
- Подключить `@nestjs/config`, `PrismaModule`, `HealthModule`.
- Скрипты в `package.json`: `start:dev`, `build`, `test`, `test:e2e`, `lint`.
- Docker Compose: `postgres` + опционально `api` service.
- `.env.example`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`.

Готово, когда:
- `npm run build` и `npm test` проходят.
- `GET /healthz` отвечает 200.

### BE-01. Подключить OpenAPI как контракт

Сделать:
- DTO-классы по схемам из `01-analysis/api/{domain}/models.yaml` для каждого endpoint.
- Имена методов контроллеров совпадают с `operationId` (или явный mapping в комментарии).
- Скрипт `npm run api:bundle` (из корня) → `openapi-typescript` для shared types (опционально `packages/api-contract`).

Готово, когда:
- `npm --prefix 01-analysis/api run lint` проходит.
- Заглушки всех 15 operationId зарегистрированы в модулях.

### BE-02. Реализовать общую HTTP-инфраструктуру

Сделать:
- `ValidationPipe` (whitelist, transform).
- `HttpExceptionFilter` → формат `01-analysis/api/common/models.yaml`: `{ code, message, details? }`.
- `JwtAuthGuard` на защищённых routes.
- Interceptor request id; логирование через pino.
- Маппинг статусов: `400`, `401`, `403`, `404`, `409`, `410`, `422`, `429`.

### BE-03. Спроектировать БД и миграции (Prisma)

Сделать:
- `prisma/schema.prisma`: `Client`, `OtpCode`, `RefreshToken`, `PushToken`, `Program`, `Chef`, `Slot`, `Booking`, `IdempotencyKey`.
- Enums: `ProgramType`, `SlotStatus`, `BookingStatus`.
- `prisma/seed.ts`: programs, chefs, slots для dev.
- Индексы: `phone`, `slotId`, `clientId`, `startAt`, `status`, idempotency composite key.

Готово, когда:
- `npx prisma migrate dev` на пустой PostgreSQL.
- Seed создаёт читаемые слоты.

### BE-04. Реализовать Auth: OTP, refresh и push-токены

Сделать:
- `AuthService.requestAuthCode`: E.164, rate limit, OTP hash + TTL, `resend_after_seconds`.
- `AuthService.verifyAuthCode`: проверка OTP, create client, issue JWT pair, `is_new`.
- `AuthService.refreshToken`: rotation, 401 на reuse/expired.
- `AuthService.logout`: invalidate refresh.
- Push: `registerPushToken` / `deletePushToken`, `platform=web`, идемпотентность.
- Dev: OTP provider пишет код в лог.

### BE-05. Реализовать Profile

Сделать:
- `ProfileController` + `ProfileService`: `getProfile`, `updateProfile` (только `name`).
- `@UseGuards(JwtAuthGuard)`; client id из JWT payload.

### BE-06. Реализовать read-only каталог: слоты, программы, шефы

Сделать:
- `CatalogService`: `listChefs`, `listPrograms`.
- `SlotsService`: `listSlots` (фильтры + pagination), `getSlot` (вложенные program/chef).
- Нет POST/PATCH/DELETE на catalog/slots из клиентского API.

### BE-07. Реализовать атомарное создание брони

Сделать:
- `BookingsService.createBooking` в `$transaction`:
  - `SELECT ... FOR UPDATE` на slot (Prisma `$queryRaw` или interactive transaction).
  - Проверка `status`, `free_seats`, `free_rental_sets`.
  - `BookingLimits` из `src/domain/`.
  - `PriceCalculator` → `price_total`.
  - Idempotency interceptor/service.
- Ошибки: `409` slot_full, `410` slot_cancelled, `422` validation.

### BE-08. Реализовать список и детали броней

Сделать:
- `listBookings`: filter `clientId` из JWT, pagination, include slot/program/chef.
- `getBooking`: 403 если `booking.clientId !== currentUser`.

### BE-09. Реализовать отмену брони (правило 24 ч)

Сделать:
- `CancellationPolicy` в `src/domain/` + injectable `Clock`.
- Ранняя (≥ 24 ч): `cancelled`, вернуть seats/rental в slot.
- Поздняя (< 24 ч): `late_cancel`, не освобождать.
- Только `active`, только до `start_at`.
- Hook/seed для `studio_cancelled` при `slot.status = cancelled`.

### BE-10. Довести контрактные ошибки и валидацию

Сделать:
- Единый `HttpExceptionFilter` на все модули.
- `details` для `slot_full`: `available_seats`, `available_rental_sets`.
- E2e tests на формат ошибок.

### BE-11. Добавить полный набор тестов

Сделать:
- Unit: `CancellationPolicy`, `BookingLimits`, `PriceCalculator`, idempotency.
- Service tests с mocked Prisma.
- E2e: auth flow, create/cancel booking.
- Concurrency: parallel `createBooking` на последнее место (testcontainers PG).

### BE-12. Добавить k6 performance tests до 300 concurrent users

Сделать:
- Сценарии в `backend/k6/` или корневой `k6/`: list slots, create, cancel.
- Пороги: p95, error rate < 1%.

### BE-13. Подготовить локальный запуск и документацию разработчика

Сделать:
- Обновить `backend/README.md`, `.env.example`, `docker-compose.yml`.
- Команды: `npm run start:dev`, `npx prisma migrate dev`, `npx prisma db seed`.

### BE-14. Финальная проверка готовности BE

Сделать:
- Чеклист всех operationId.
- `npm test`, `npm run test:e2e`, k6 smoke.
- Ручной happy path UC-1…UC-6.

## Доменные инварианты (чеклист)

- [ ] Параллельные `createBooking` не дают овербукинг мест и проката.
- [ ] `Idempotency-Key` возвращает тот же `201` при повторе с тем же телом.
- [ ] Поздняя отмена не увеличивает `free_seats` / `free_rental_sets`.
- [ ] Клиент не видит чужие брони (`403`).
- [ ] Запись на `cancelled` слот → `410 Gone`.
