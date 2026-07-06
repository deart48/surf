# Шеф-стол — клиентское web-приложение и API

Учебный проект кулинарной студии «Шеф-стол»: клиент записывается на кулинарные классы через адаптивное web-приложение; слоты, программы и шефы приходят из существующей инфраструктуры только для чтения.

## Структура репозитория

| Раздел | Содержание |
| :-- | :-- |
| [01-analysis/](01-analysis/README.md) | Бриф, требования, модель данных, OpenAPI, ТЗ на 10 экранов (SCR-01…SCR-10) и 9 логик (LOGIC-001…009) |
| [02-development/](02-development/) | Планы и чек-листы реализации backend и web-клиента |
| [backend/](backend/README.md) | NestJS REST API — auth, catalog, slots, bookings, profile |
| [web/](web/README.md) | React 19 SPA — все экраны MVP, HTTP-интеграция с backend |
| [03-test/results/](03-test/results/) | Тест-кейсы, баг-репорт, проверка фич и импакт-ревью требований |
| [AGENTS.md](AGENTS.md) | Правила для AI-агентов и разработчиков |

## Текущий статус

**Анализ и контракты** — готовы к разработке: требования, ER-модель, многофайловый OpenAPI (`auth`, `slots`, `bookings`, `profile`, `catalog`).

**Backend** — реализован по OpenAPI: NestJS 11, Prisma, PostgreSQL 16, JWT + OTP, идемпотентный `createBooking` с row-level locking, доменные unit-тесты (18/18). Подробности и ограничения — [backend/README.md](backend/README.md), незавершённые шаги — [backend/NEXT_STEPS.md](backend/NEXT_STEPS.md).

**Web-клиент** — реализованы все 10 экранов, mock-слой заменён на реальные HTTP-вызовы. Сборка (`tsc` + Vite) и линт проходят. Детали — [web/README.md](web/README.md).

**Проверка качества** (2026-07-06): критерий «≥ 3 фичи» выполнен ([feature-implementation-check.md](03-test/results/feature-implementation-check.md)); зафиксировано 5 открытых дефектов UI ([bug-report.md](03-test/results/bug-report.md)). Живой E2E против PostgreSQL в среде проверки не выполнялся.

### Что ещё не сделано (кратко)

- Прогон backend на реальной БД: миграции, seed, ручной happy path, concurrency-тест на овербукинг.
- k6-нагрузка до 300 concurrent users; structured logging (`pino`); `RequestIdInterceptor`.
- Unit-тесты сервисов NestJS на mock Prisma.
- Web Push без Service Worker / VAPID (упрощённая реализация); TanStack Query и `openapi-typescript` из плана — не подключены (ручной API-слой).

## Быстрый старт (полный стек)

### 1. PostgreSQL и API

```bash
cd backend
npm install
cp .env.example .env

docker compose --profile db up -d db
npx prisma migrate dev
npx prisma db seed
npm run start:dev          # http://localhost:8080
```

Проверка: `curl http://localhost:8080/healthz` → `{"status":"ok"}`.

### 2. Web-клиент

```bash
cd web
npm install
cp .env.example .env       # VITE_API_BASE_URL=http://localhost:8080
npm run dev                # http://localhost:5173
```

### 3. OpenAPI-документация (из корня репозитория)

```bash
npm --prefix 01-analysis/api install   # первый раз
npm --prefix 01-analysis/api run lint
npm --prefix 01-analysis/api run bundle
npm --prefix 01-analysis/api run preview
```

## С чего начать

| Задача | Куда смотреть |
| :-- | :-- |
| Понять продукт и экраны | [01-analysis/5-web-app-spec/README.md](01-analysis/5-web-app-spec/README.md) |
| Сверить API с экраном | [01-analysis/api/redocly.yaml](01-analysis/api/redocly.yaml) + ТЗ экрана (`operationId`, схемы, коды ошибок) |
| Разработка backend | [02-development/BE_IMPLEMENTATION_PLAN.md](02-development/BE_IMPLEMENTATION_PLAN.md), [BACKEND_IMPLEMENTATION_CHECKLIST.md](02-development/BACKEND_IMPLEMENTATION_CHECKLIST.md) |
| Разработка web | [02-development/WEB_CLIENT_IMPLEMENTATION_PLAN.md](02-development/WEB_CLIENT_IMPLEMENTATION_PLAN.md), [CLIENT_UI_IMPLEMENTATION_PLAN.md](02-development/CLIENT_UI_IMPLEMENTATION_PLAN.md) |
| Доделать backend после клонирования | [backend/NEXT_STEPS.md](backend/NEXT_STEPS.md) |
| Тестирование и дефекты | [03-test/results/test-cases.md](03-test/results/test-cases.md), [bug-report.md](03-test/results/bug-report.md) |

## Целевой стек

| Слой | Технологии |
| :-- | :-- |
| **Backend** | NestJS 11, Node.js 22+, TypeScript, Prisma, PostgreSQL 16, JWT + OTP, k6 (цель — 300 concurrent users) |
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS v4, React Router 7 — адаптивное web-приложение (desktop + mobile web) |

## Ключевые доменные отличия от «соседних» учебных проектов

- Предметная область: кулинарные классы, шефы, программы/меню, экипировка (фартук + ножи).
- Лимит брони: до **6** мест (себя + 5 гостей); прокат до **6 комплектов** на стол.
- Отмена: ранняя **≥ 24 ч**, поздняя **< 24 ч**; статус `studio_cancelled` при отмене класса студией.
- API-домен `catalog` (`listChefs`, `listPrograms`) вместо instructors/routes.

## Скоуп MVP

**В скоупе:** вход по телефону/OTP, список и фильтры классов, карточка, оформление брони, мои брони, отмена, профиль, push-напоминание (упрощённо).

**Вне скоупа:** админка, расписание CRUD, оценки шефов (Phase 2), онлайн-оплата, лояльность.
