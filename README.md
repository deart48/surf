# Шеф-стол — клиентское web-приложение и API

Учебный проект кулинарной студии «Шеф-стол»: клиент записывается на кулинарные классы через web-приложение; слоты, программы и шефы приходят из существующей инфраструктуры только для чтения.

## Что уже есть

| Раздел | Содержание |
| :-- | :-- |
| [01-analysis/](01-analysis/README.md) | Бриф, требования, модель данных, OpenAPI, ТЗ на 10 экранов и 9 логик |
| [02-development/](02-development/) | Планы реализации backend и web-клиента |
| [AGENTS.md](AGENTS.md) | Правила для AI-агентов и разработчиков |

Код приложения (`backend/`, `web/`) — следующий этап; каркас описан в планах разработки.

## Быстрый старт (анализ и API)

```bash
# Проверить OpenAPI-контракты
npm --prefix 01-analysis/api install
npm --prefix 01-analysis/api run lint

# Собрать домены в dist/ (игнорируется git)
npm --prefix 01-analysis/api run bundle

# Локальный просмотр документации API
npm --prefix 01-analysis/api run preview
```

## С чего начать разработку

1. Прочитать [01-analysis/5-web-app-spec/README.md](01-analysis/5-web-app-spec/README.md) — реестр экранов, доменные правила, трассировка требований.
2. Сверить контракт в [01-analysis/api/redocly.yaml](01-analysis/api/redocly.yaml) с ТЗ на нужном экране (`operationId`, схемы, коды ошибок).
3. Следовать [02-development/BE_IMPLEMENTATION_PLAN.md](02-development/BE_IMPLEMENTATION_PLAN.md) для backend.
4. Следовать [02-development/WEB_CLIENT_IMPLEMENTATION_PLAN.md](02-development/WEB_CLIENT_IMPLEMENTATION_PLAN.md) для web-клиента.

## Целевой стек

- **Backend:** NestJS (Node.js 22, TypeScript), Prisma, PostgreSQL 16, OpenAPI-first, k6 до 300 concurrent users.
- **Frontend:** React 19, Vite, TanStack Query, TypeScript — адаптивное web-приложение (desktop + mobile web).

## Ключевые доменные отличия от «соседних» учебных проектов

- Предметная область: кулинарные классы, шефы, программы/меню, экипировка (фартук + ножи).
- Лимит брони: до **6** мест (себя + 5 гостей); прокат до **6 комплектов** на стол.
- Отмена: ранняя **≥ 24 ч**, поздняя **< 24 ч**; статус `studio_cancelled` при отмене класса студией.
- API-домен `catalog` (`listChefs`, `listPrograms`) вместо instructors/routes.

## Скоуп MVP

**В скоупе:** вход по телефону/OTP, список и фильтры классов, карточка, оформление брони, мои брони, отмена, профиль, push-напоминание.

**Вне скоупа:** админка, расписание CRUD, оценки шефов (Phase 2), онлайн-оплата, лояльность.
