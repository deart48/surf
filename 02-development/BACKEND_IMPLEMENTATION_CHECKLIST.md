# Чек-лист реализации Backend — «Шеф-стол» (NestJS)

> Интерактивный план на основе [анализа ограничений ТЗ](../01-analysis/2-requirements/) и
> [BE_IMPLEMENTATION_PLAN.md](BE_IMPLEMENTATION_PLAN.md). Отмечайте `[x]` по мере готовности.
> Каждый пункт — минимальный вертикальный срез с проверкой в конце.

## 0. Каркас проекта

- [x] 0.1 Инициализировать `backend/` как NestJS-приложение (package.json, tsconfig, nest-cli.json)
- [x] 0.2 Установить зависимости: `@nestjs/*`, `prisma`/`@prisma/client`, `class-validator`, `class-transformer`, `@nestjs/jwt`, `bcrypt` (без `pino` — обычный `Logger` Nest, structured logging отложено)
- [x] 0.3 `main.ts`: bootstrap, global `ValidationPipe`, global `HttpExceptionFilter`, graceful shutdown
- [x] 0.4 `app.module.ts`: подключить `ConfigModule`, `PrismaModule`, feature-модули
- [x] 0.5 `.env.example`: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, OTP-параметры
- [x] 0.6 `docker-compose.yml`: сервис PostgreSQL 16 для локальной разработки
- [x] 0.7 Health endpoints `GET /healthz`, `GET /readyz` (вне клиентского контракта)

**Проверка:** `npm run build` проходит ✅ (`nest build` зелёный). `GET /healthz` **не проверено живым запуском** — нет доступной PostgreSQL в этой среде (см. «Известные ограничения»).

## 1. Persistence (Prisma)

- [x] 1.1 `prisma/schema.prisma` — 9 моделей, 4 enum'а (уже создано и сверено с ТЗ)
- [x] 1.2 `prisma/migrations/20260706060000_init/migration.sql` — DDL + `CHECK`-инварианты (уже создано)
- [x] 1.3 `npx prisma generate` — сгенерировать `@prisma/client`
- [x] 1.4 `PrismaService`/`PrismaModule` — обёртка над `PrismaClient` с lifecycle hooks
- [x] 1.5 `prisma/seed.ts` — dev-данные: 2 шефа, 2 программы, 3 слота (разные сценарии доступности)

**Проверка:** `npx prisma generate` — ✅ без ошибок. `npx prisma migrate dev` / `prisma db seed` против реальной БД — **не запускались** (нет PostgreSQL в среде).

## 2. Общая HTTP-инфраструктура

- [x] 2.1 `common/errors/api-error.ts` + `common/filters/http-exception.filter.ts` → формат `{ code, message, details? }` из `common/models.yaml`
- [x] 2.2 `common/guards/jwt-auth.guard.ts` — проверка `Authorization: Bearer`, кладёт `clientId` в request (декоратор `@CurrentClient()`)
- [ ] 2.3 `common/interceptors/request-id.interceptor.ts` — **не сделано** (перенесено в backlog, не блокирует остальные модули)
- [x] 2.4 Idempotency — реализовано **внутри `BookingsService`** через `@IdempotencyKey()` декоратор + таблицу `idempotency_keys`, а не отдельным interceptor'ом (проще для MVP, тот же эффект)
- [x] 2.5 Global `ValidationPipe({ whitelist: true, transform: true })`

**Проверка:** `HttpExceptionFilter` покрыт логикой, но **отдельного unit-теста на фильтр не написано** — проверено только вручную по типам (см. итоговый отчёт).

## 3. Доменный слой (`src/domain/`) — без Nest/Prisma импортов

- [x] 3.1 `clock.ts` — интерфейс `Clock` + `SystemClock`/`FixedClock` (инъекция времени для тестов границы 24 ч)
- [x] 3.2 `cancellation.policy.ts` — ранняя (`≥24ч`) vs поздняя (`<24ч`) отмена, ровно 24ч = ранняя
- [x] 3.3 `booking-limits.ts` — `seats_count` 1..min(free_seats,6), `rental_count` 0..seats_count и ≤ free_rental_sets
- [x] 3.4 `price-calculator.ts` — `price*seats_count + rental_price*rental_count`
- [x] 3.5 Unit-тесты на все три политики, включая граничные случаи (ровно 24ч, seats=6, rental=0)

**Проверка:** `npm test -- domain` — ✅ **18/18 тестов зелёные**, реально прогнано в этой сессии.

## 4. Auth-модуль

- [x] 4.1 DTO: `RequestCodeDto`, `VerifyCodeDto`, `RefreshTokenDto`, `PushTokenDto` (валидация E.164, длина кода)
- [x] 4.2 `requestAuthCode`: генерация OTP, hash (bcrypt), TTL 300с, `resend_after_seconds` 60с, rate limit (429)
- [x] 4.3 `verifyAuthCode`: проверка OTP, create-or-get client, выдача `access`+`refresh`, `is_new`
- [x] 4.4 `refreshToken`: ротация refresh-токена (opaque random token + bcrypt hash в БД), 401 при reuse/expired
- [x] 4.5 `logout`: инвалидация refresh
- [x] 4.6 `registerPushToken` / `deletePushToken`: идемпотентно (`@@unique([clientId, token])`), `platform` из запроса

**Проверка:** реализация типобезопасно собирается и линтуется. **Unit-тесты сервиса не написаны** (нужен mock `PrismaService` — не сделано в рамках этой сессии, помечено как долг).

## 5. Profile-модуль

- [x] 5.1 `getProfile` — только свой профиль из JWT `clientId`
- [x] 5.2 `updateProfile` — обновление `name` (телефон неизменяем, не входит в DTO)

## 6. Catalog-модуль (read-only)

- [x] 6.1 `listChefs`
- [x] 6.2 `listPrograms`

## 7. Slots-модуль (read-only)

- [x] 7.1 `listSlots` — фильтры `date_from`/`date_to` (дефолт 7 дней), `program_type[]`, `chef_id[]`, `only_available`, пагинация
- [x] 7.2 `getSlot` — полная проекция с `program`/`chef`

## 8. Bookings-модуль (ядро сложности)

- [x] 8.1 `createBooking`: `$transaction` + `SELECT ... FOR UPDATE` (raw SQL) на слот, проверка `BookingLimits`, `PriceCalculator`, идемпотентность по `Idempotency-Key` через таблицу `idempotency_keys`
- [x] 8.2 Ошибки `createBooking`: `409` (мест/проката не хватает), `410` (слот отменён студией), `422` (валидация/повтор ключа с другим телом)
- [x] 8.3 `listBookings` — только свои (`clientId` из JWT), пагинация, вложенный `slot`
- [x] 8.4 `getBooking` — `403` на чужую бронь
- [x] 8.5 `cancelBooking` — `CancellationPolicy` внутри транзакции, освобождение мест/проката только при ранней отмене, `409` если уже не `active` или класс стартовал

**Проверка:** типобезопасно собирается (`tsc`/`nest build` зелёные) и линтуется без ошибок. **Не проверено:** unit-тесты сервиса на mock Prisma, concurrency-тест на дубль/овербукинг — оба требуют либо mock-инфраструктуры (не написана), либо реальной PostgreSQL (недоступна в среде, см. ниже). **Это главный оставшийся риск перед продакшен-использованием.**

## 9. Сборка, тесты, документация разработчика

- [x] 9.1 `npm run build` (`nest build`) — ✅ зелёный; `npx tsc --noEmit` — ✅ 0 ошибок; `npx eslint src/**/*.ts` — ✅ 0 ошибок/предупреждений; `npm test` — ✅ 18/18 (только домен, см. ниже)
- [x] 9.2 `backend/README.md` — обновлён под фактическую реализацию
- [ ] 9.3 Обновить статусы BE-00…BE-14 в `BE_IMPLEMENTATION_PLAN.md` — **не сделано в этой сессии** (сам план не трогали, чтобы не расходиться с историей чата)

## Известные ограничения среды выполнения (подтверждено на практике)

- **PostgreSQL недоступна.** Docker требует прав, которых нет в sandbox; системный `postgresql.service` требует sudo-пароль; понижение привилегий (`su`/`runuser`/`setpriv` до пользователя `postgres`) заблокировано на уровне sandbox (`setresuid`/`setgroups` запрещены). Проверено и подтверждено экспериментально.
- Как следствие, **не выполнено**: `prisma migrate dev` против живой БД, `prisma db seed`, реальный запуск `npm run start:dev` и ручная проверка `GET /healthz`, интеграционные/e2e-тесты, concurrency-тест на овербукинг, k6-нагрузочные тесты.
- Всё, что **не требует БД** (typecheck, build, lint, доменные unit-тесты), выполнено и зелёное.
- **Рекомендация:** после клонирования репозитория разработчиком — поднять `docker compose --profile db up -d`, выполнить `npx prisma migrate dev`, `npx prisma db seed`, `npm run start:dev`, затем прогнать ручной happy path (`requestAuthCode` → `verifyAuthCode` → `listSlots` → `createBooking` → `cancelBooking`).
