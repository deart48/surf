# NEXT_STEPS — что доделать после этой сессии

Этот файл — пошаговая инструкция по пунктам, которые остались незавершёнными
после первичной реализации backend'а (см. итоговый статус в
[`../02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md`](../02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md)).
Причина незавершённости почти везде одна: **в sandbox-среде сессии не было
доступной PostgreSQL** (Docker и понижение привилегий до `postgres`
заблокированы). У разработчика с обычным окружением этих ограничений нет.

Каждый пункт: что сделать → куда → как проверить готовность.

---

## 1. Живой прогон на реальной PostgreSQL

**Зачем:** ни одна миграция, сид или HTTP-запрос ни разу не выполнялись против
настоящей БД — только статический анализ схемы и `prisma generate`.

Шаги:

```bash
cd backend
npm install
cp .env.example .env

# Поднять Postgres 16 локально
docker compose --profile db up -d db

# Применить миграцию из prisma/migrations/20260706060000_init
npx prisma migrate dev

# Наполнить БД dev-данными (2 шефа, 2 программы, 3 слота — prisma/seed.ts)
npx prisma db seed

# Запустить API
npm run start:dev
```

Проверка готовности:

- `docker compose ps` показывает `db` как `healthy`/`running`.
- `npx prisma migrate dev` не создаёт diff (схема уже применена) и не падает на `CHECK`-констрейнтах.
- `curl http://localhost:8080/healthz` → `{"status":"ok"}`.
- В таблицах `chefs`/`programs`/`slots` есть данные (`npx prisma studio` для визуальной проверки).

Если `prisma migrate dev` ругается на несовпадение схемы/миграции — сравнить
`prisma/schema.prisma` с `prisma/migrations/20260706060000_init/migration.sql`
(они писались вручную синхронно, но не проверялись живым `migrate diff`).

---

## 2. Ручная проверка happy path через HTTP

**Зачем:** ни один endpoint не вызывался по-настоящему, только собирался типами.

После шага 1 (`npm run start:dev` поднят) прогнать вручную (curl/Postman/Insomnia):

```bash
# 1. Запросить код
curl -X POST localhost:8080/auth/request-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+79991234567"}'
# ответ содержит "code" (dev-режим без SMS) — скопировать его

# 2. Подтвердить код (code из ответа шага 1)
curl -X POST localhost:8080/auth/verify-code \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+79991234567","code":"<CODE>"}'
# ответ содержит access_token/refresh_token — сохранить access_token

# 3. Посмотреть слоты
curl localhost:8080/slots -H 'Authorization: Bearer <ACCESS_TOKEN>'

# 4. Забронировать (slot_id взять из ответа шага 3)
curl -X POST localhost:8080/bookings \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 11111111-1111-1111-1111-111111111111' \
  -d '{"slot_id":"<SLOT_ID>","seats_count":2,"rental_count":1}'

# 5. Повторить запрос №4 с тем же Idempotency-Key и тем же телом —
#    должен вернуться тот же результат, а не вторая бронь (проверка LOGIC-004)

# 6. Отменить бронь (booking id из ответа шага 4)
curl -X POST localhost:8080/bookings/<BOOKING_ID>/cancel \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

Проверка готовности: все шаги возвращают ожидаемые статусы (200/201/204),
формат ошибок при намеренно неверных данных (например, `seats_count: 10`)
соответствует `{ code, message, details? }`.

---

## 3. Concurrency-тест на овербукинг (самый важный тест-долг)

**Зачем:** это ключевой инвариант NFR-4/R-004 — `SELECT ... FOR UPDATE` в
`BookingsService.createBooking` (`backend/src/modules/bookings/bookings.service.ts`)
написан по спецификации, но ни разу не проверялся под настоящей конкурентностью.

Куда добавить: `backend/test/concurrency/booking-race.e2e-spec.ts` (новая папка).

Рекомендуемый сценарий теста:

1. Поднять тестовую БД (testcontainers `postgres:16` или docker-compose с отдельной схемой).
2. Применить миграции (`npx prisma migrate deploy`).
3. Создать через Prisma слот с `free_seats = 1`, `free_rental_sets = 1`.
4. Создать двух тестовых клиентов с валидными access-токенами (или вызвать `AuthService` напрямую в тесте).
5. Отправить **параллельно** (`Promise.all`) два запроса `POST /bookings` с `seats_count: 1` на один и тот же слот от разных клиентов.
6. Assert: ровно один запрос вернул `201`, второй — `409 SEATS_UNAVAILABLE`.
7. Assert: в БД `slots.free_seats === 0`, `bookings` содержит ровно одну запись `active`.

Псевдокод:

```ts
const [first, second] = await Promise.all([
  request(app.getHttpServer()).post('/bookings').set('Authorization', `Bearer ${tokenA}`).send(bookingDto),
  request(app.getHttpServer()).post('/bookings').set('Authorization', `Bearer ${tokenB}`).send(bookingDto),
]);

const statuses = [first.status, second.status].sort();
expect(statuses).toEqual([201, 409]);
```

Проверка готовности: тест стабильно (несколько запусков подряд) не даёт двух
`201` и не даёт `free_seats < 0`.

---

## 4. Unit-тесты сервисов на mock `PrismaService`

**Зачем:** сейчас тестами покрыт только чистый доменный слой
(`src/domain/*.spec.ts`, 18/18 зелёных). Сервисы (`AuthService`,
`ProfileService`, `CatalogService`, `SlotsService`, `BookingsService`) не
покрыты вообще.

Куда добавить: `*.spec.ts` рядом с каждым сервисом, например
`backend/src/modules/auth/auth.service.spec.ts`.

Подход — мокать `PrismaService` через `@nestjs/testing`:

```ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CLOCK } from '../../infrastructure/clock/clock.module';
import { FixedClock } from '../../domain/clock';
import { JwtService } from '@nestjs/jwt';
import { OtpProvider } from './otp.provider';

const prismaMock = {
  otpCode: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  client: { findUnique: jest.fn(), create: jest.fn() },
  refreshToken: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  pushToken: { upsert: jest.fn(), deleteMany: jest.fn() },
};

const moduleRef = await Test.createTestingModule({
  providers: [
    AuthService,
    OtpProvider,
    JwtService,
    { provide: PrismaService, useValue: prismaMock },
    { provide: CLOCK, useValue: new FixedClock(new Date('2026-07-10T12:00:00Z')) },
  ],
}).compile();
```

Приоритетные кейсы для покрытия:

- `AuthService`: неверный код (422), просроченный код (422), rate limit на повторную отправку (429), успешный `verifyAuthCode` с `is_new=true/false`.
- `BookingsService.createBooking`: слот не найден (404), слот отменён (410), недостаточно мест (409), недостаточно проката (409), повтор с тем же `Idempotency-Key` и тем же телом (тот же ответ), повтор с тем же ключом и другим телом (422).
- `BookingsService.cancelBooking`: чужая бронь (403), уже неактивная бронь (409), класс уже начался (409), ранняя vs поздняя отмена (использовать `FixedClock`, аналогично `cancellation.policy.spec.ts`).

Проверка готовности: `npm test` показывает зелёные наборы для всех пяти сервисов, суммарное покрытие `npm run test:cov` заметно выше текущего (только домен).

---

## 5. `RequestIdInterceptor`

**Зачем:** заявлен в исходном чек-листе (п. 2.3), но не реализован — сейчас
нет request id в логах/ошибках для трассировки инцидентов.

Куда добавить: `backend/src/common/interceptors/request-id.interceptor.ts`.

Пример реализации:

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const requestId = req.headers['x-request-id'] ?? randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    return next.handle();
  }
}
```

Подключить глобально в `src/main.ts` рядом с `useGlobalFilters`:

```ts
app.useGlobalInterceptors(new RequestIdInterceptor());
```

Опционально: прокинуть `req.requestId` в `HttpExceptionFilter`
(`src/common/filters/http-exception.filter.ts`), чтобы логировать его вместе
со стектрейсом необработанных ошибок.

Проверка готовности: любой ответ API содержит заголовок `x-request-id`;
переданный клиентом `X-Request-Id` пробрасывается обратно без изменений.

---

## 6. k6 нагрузочные тесты

**Зачем:** NFR из `AGENTS.md` требует прогон до 300 конкурентных пользователей
на бронировании/отмене — не запускалось вообще.

Куда добавить: `backend/test/k6/booking-load.js`.

Минимальный сценарий:

```js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    booking_peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 300 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // TODO: получить access_token (заранее сгенерированный набор тестовых токенов,
  // не гонять OTP-флоу под нагрузкой) и slot_id из seed-данных.
  const res = http.get(`${__ENV.BASE_URL}/slots`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

Запуск: `k6 run -e BASE_URL=http://localhost:8080 -e TEST_TOKEN=... test/k6/booking-load.js`.

Проверка готовности: пороги `thresholds` не нарушены при 300 VU; отдельно
прогнать сценарий с параллельными `createBooking` на один и тот же слот и
убедиться, что `free_seats` в БД не уходит в отрицательные значения (пересечение
с пунктом 3).

---

## 7. Structured logging (`pino`)

**Зачем:** сейчас используется штатный `Logger` из `@nestjs/common` — без
JSON-формата и request id в каждой строке, что усложнит агрегацию логов в проде.

Шаги:

```bash
npm install nestjs-pino pino-http
```

В `src/app.module.ts` добавить `LoggerModule.forRoot({ pinoHttp: { autoLogging: true } })`
из `nestjs-pino`, в `src/main.ts` — `app.useLogger(app.get(Logger))`.

Проверка готовности: логи в консоли/файле в формате JSON, каждый HTTP-запрос
логируется с `req.id`/статусом/длительностью.

---

## 8. Обновить статусы в `BE_IMPLEMENTATION_PLAN.md`

Куда: `../02-development/BE_IMPLEMENTATION_PLAN.md`, пункты `BE-00`…`BE-14`.

Проставить фактический статус (готово / частично / не начато) по каждому
пункту, сверяясь с [`BACKEND_IMPLEMENTATION_CHECKLIST.md`](../02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md) —
это уже сделано подробно на уровне чек-листа, здесь просто нужно
продублировать итог в исходном плановом документе для консистентности.

---

## Рекомендуемый порядок выполнения

1. П.1 (живая БД) — без него все остальные пункты невозможны.
2. П.2 (ручной happy path) — быстрая проверка, что вообще всё работает.
3. П.4 (unit-тесты сервисов) — дешевле и быстрее находит баги, чем e2e.
4. П.3 (concurrency-тест) — самый важный тест-долг перед продакшеном.
5. П.5 (request id) — маленькая, независимая задача, можно в любой момент.
6. П.6 (k6) — после того как API стабилен и покрыт тестами.
7. П.7 (pino) — некритично для MVP, можно отложить.
8. П.8 (обновить план) — финальный шаг для консистентности документации.
