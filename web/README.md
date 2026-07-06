# Web Client — «Шеф-стол»

TypeScript SPA (React 19 + Vite + Tailwind CSS v4) для клиентского web-приложения «Шеф-стол».
Экраны и логики — `../01-analysis/5-web-app-spec/`; чек-лист реализации —
[`../02-development/CLIENT_UI_IMPLEMENTATION_PLAN.md`](../02-development/CLIENT_UI_IMPLEMENTATION_PLAN.md).

## Статус

Экраны `SCR-01…SCR-10` подключены к реальному NestJS backend (`../backend`) по HTTP —
mock-слой (`src/mock/`) удалён. Подробный отчёт (что сделано / что не проверено живьём) — в
конце `CLIENT_UI_IMPLEMENTATION_PLAN.md`, раздел «10. Сетевая интеграция с backend».

## Запуск

```bash
npm install
cp .env.example .env       # VITE_API_BASE_URL, по умолчанию http://localhost:8080

# backend должен быть поднят отдельно — см. ../backend/README.md
npm run dev                 # http://localhost:5173
```

## Команды

```bash
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview
```

## Структура

```text
src/
  app/            # роутер, layout, сессия (реальные JWT), route guard
  domain/         # чистые политики: цена, лимиты, правило отмены 24ч (клиентское превью)
  api/
    client.ts     # fetch-обёртка: базовый URL, Authorization, silent refresh на 401
    tokenStorage.ts # access/refresh токены в localStorage
    endpoints.ts  # функции = operationId из OpenAPI, реальные HTTP-вызовы к backend
    types.ts      # типы ответов по контракту (snake_case, как в 01-analysis/api)
  features/
    auth/         # SCR-01, SCR-02
    catalog/      # SCR-03, SCR-04, SCR-05
    booking/      # SCR-06, SCR-07, SCR-08, SCR-09
    profile/      # SCR-10
  shared/         # UI-kit: Button, Card, Modal, StatusBadge, Counter, Empty/Error/Spinner
```

## Известное ограничение

Сетевая интеграция не проверена против живой PostgreSQL/backend (sandbox-среда этой сессии не
даёт поднять БД — см. `../backend/NEXT_STEPS.md` п.1). Проверено статически: `tsc -b`,
`vite build`, `oxlint` — чисто. Перед продакшен-использованием обязательно прогнать backend с
реальной БД и пройти ручной сценарий request-code → verify-code → slots → booking → cancel через
UI, а не только curl (см. `backend/NEXT_STEPS.md` п.2).
