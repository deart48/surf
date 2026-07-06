# План реализации web-клиента для «Шеф-стол»

## Контекст

Документ проектирует **клиентское web-приложение** (роль «Клиент») для desktop и mobile browser. Основа: feature-модули по экранам `SCR-*`, переиспользуемые логики `LOGIC-*`, интеграция с NestJS BE и OpenAPI из `01-analysis/api`.

Источники:

- `01-analysis/5-web-app-spec/README.md` и экранные ТЗ `SCR-01`…`SCR-10`.
- Логики `01-analysis/5-web-app-spec/09_Логики/LOGIC-*`.
- API: `01-analysis/api/{auth,slots,bookings,profile,catalog}/`.
- `02-development/BE_IMPLEMENTATION_PLAN.md`.
- Дизайн-бриф `01-analysis/3-design-brief/` (адаптивность, a11y, web-специфика).

## TOC / Todo реализации

- [ ] [WEB-00. Создать каркас SPA](#web-00-создать-каркас-spa)
- [ ] [WEB-01. API-клиент и типы из OpenAPI](#web-01-api-клиент-и-типы-из-openapi)
- [ ] [WEB-02. Сессия, роутинг и route guard](#web-02-сессия-роутинг-и-route-guard)
- [ ] [WEB-03. SCR-01 / SCR-02 — вход и OTP](#web-03-scr-01--scr-02--вход-и-otp)
- [ ] [WEB-04. SCR-03 / SCR-04 — список классов и фильтры](#web-04-scr-03--scr-04--список-классов-и-фильтры)
- [ ] [WEB-05. SCR-05 — карточка класса](#web-05-scr-05--карточка-класса)
- [ ] [WEB-06. SCR-06 — оформление записи](#web-06-scr-06--оформление-записи)
- [ ] [WEB-07. SCR-07 — запись создана и push](#web-07-scr-07--запись-создана-и-push)
- [ ] [WEB-08. SCR-08 / SCR-09 — мои брони и отмена](#web-08-scr-08--scr-09--мои-брони-и-отмена)
- [ ] [WEB-09. SCR-10 — профиль и выход](#web-09-scr-10--профиль-и-выход)
- [ ] [WEB-10. UI-состояния, ошибки, a11y](#web-10-ui-состояния-ошибки-a11y)
- [ ] [WEB-11. Тесты и финальная приёмка](#web-11-тесты-и-финальная-приёмка)

## Стек

- TypeScript 5+, React 19, Vite.
- Роутинг: React Router 7.
- Серверное состояние: TanStack Query (кэш слотов/броней, invalidation, retry).
- API-клиент: `openapi-typescript` + `openapi-fetch` (типы из bundle `01-analysis/api`).
- Формы: React Hook Form + Zod.
- Сессия: React context + `localStorage` (LOGIC-002).
- Стили: Tailwind CSS (адаптив desktop/mobile); опционально shadcn/ui для sheet/modal.
- Тесты: Vitest + Testing Library; e2e опционально Playwright.
- Web Push: Service Worker + Push API (`platform: web`).

## Целевая структура

```text
web/
  package.json
  vite.config.ts
  src/
    app/                 # роутер, providers, layout
    api/                 # generated types, api client, error mapping
    domain/              # pure policies: price, availability, cancellation
    features/
      auth/              # SCR-01, SCR-02
      catalog/           # SCR-03, SCR-04, SCR-05
      booking/           # SCR-06, SCR-07, SCR-08, SCR-09
      profile/           # SCR-10
    shared/              # ui kit, hooks, formatters
    sw/                  # service worker для push (если нужен отдельный entry)
```

## Маршруты

| Путь | Экран | Зона | Guard |
| :-- | :-- | :-- | :-- |
| `/login` | SCR-01 | НЗ | redirect if authed |
| `/login/verify` | SCR-02 | НЗ | — |
| `/classes` | SCR-03 | АЗ | auth |
| `/classes/:slotId` | SCR-05 | АЗ | auth |
| `/classes/:slotId/book` | SCR-06 | АЗ | auth |
| `/bookings/:id/success` | SCR-07 | АЗ | auth |
| `/bookings` | SCR-08 | АЗ | auth |
| `/bookings/:id` | SCR-09 | АЗ | auth |
| `/profile` | SCR-10 | АЗ | auth |

Фильтры SCR-04 — модалка/панель поверх SCR-03, не отдельный route (или query-state `?filters=open`).

## Сквозные логики → модули

| LOGIC | Модуль | Ключевое поведение |
| :-- | :-- | :-- |
| LOGIC-001 | `features/auth/otpTimer` | `resend_after_seconds`, блок кнопки, 429 |
| LOGIC-002 | `app/session` | tokens, refresh on 401, logout, route guard |
| LOGIC-003 | `domain/bookingPreview` | лимиты мест/проката, live price (UI preview; сервер — источник истины) |
| LOGIC-004 | `features/booking/create` | `Idempotency-Key` UUID, double-submit guard |
| LOGIC-005 | `domain/cancellation` | 24h rule, copy для ранней/поздней отмены |
| LOGIC-006 | `features/booking/grouping` | предстоящие / история по `slot.start_at` |
| LOGIC-007 | `features/catalog/filters` | query assembly, OR/AND, default 7 days |
| LOGIC-008 | `shared/pagination` | limit/offset, load more |
| LOGIC-009 | `features/push` | permission, register/delete token |

## Декомпозиция

### WEB-00. Создать каркас SPA

Сделать:
- `npm create vite@latest web -- --template react-ts`.
- Базовый layout: header/nav (Классы, Мои брони, Профиль), error boundary.
- Env: `VITE_API_BASE_URL`.

Готово, когда:
- `npm run dev` стартует, `npm run build` проходит.

### WEB-01. API-клиент и типы из OpenAPI

Сделать:
- Генерация TypeScript types из bundled OpenAPI (`openapi-typescript` или аналог).
- Обёртка: Bearer injection, JSON parse, map `{ code, message, details }`.

### WEB-02. Сессия, роутинг и route guard

Сделать:
- Хранение access/refresh (memory + secure persistence по LOGIC-002).
- Silent `refreshToken` на 401, единый redirect на `/login`.
- Protected routes для АЗ.

### WEB-03. SCR-01 / SCR-02 — вход и OTP

Сделать:
- Маска телефона E.164, поле имени при первом входе.
- OTP cells, paste support, `autocomplete="one-time-code"`.
- `requestAuthCode`, `verifyAuthCode`, `updateProfile` при `is_new`.
- LOGIC-001 timer.

Критерии: AC из SCR-01, SCR-02.

### WEB-04. SCR-03 / SCR-04 — список классов и фильтры

Сделать:
- `listSlots` с дефолтом 7 дней (LOGIC-007).
- Empty state «Пока нет доступных классов».
- Фильтры: bottom sheet (mobile) / side panel (desktop).
- `listChefs`, `listPrograms` для опций фильтра.
- LOGIC-008 pagination / load more.

### WEB-05. SCR-05 — карточка класса

Сделать:
- `getSlot`, все поля FR-5.
- CTA «Записаться» / disabled для `cancelled` / нет мест.
- Sticky CTA на mobile.

### WEB-06. SCR-06 — оформление записи

Сделать:
- Счётчик мест 1..`min(free_seats, 6)`, прокат 0..`rental_count` cap.
- Поле аллергий (optional).
- Live price (LOGIC-003), итог с сервера после create.
- `createBooking` + `Idempotency-Key` (LOGIC-004).
- Обработка 409/410/422 с обновлением формы.

### WEB-07. SCR-07 — запись создана и push

Сделать:
- Экран успеха, навигация в брони / классы.
- Пре-промт + `registerPushToken` (LOGIC-009), graceful deny.

### WEB-08. SCR-08 / SCR-09 — мои брони и отмена

Сделать:
- `listBookings`, группировка LOGIC-006, статусы включая `studio_cancelled`.
- `getBooking`, `cancelBooking`, диалог с предупреждением LOGIC-005.

### WEB-09. SCR-10 — профиль и выход

Сделать:
- `getProfile`, `updateProfile`, toggle push, `logout` + local clear.

### WEB-10. UI-состояния, ошибки, a11y

Сделать:
- Loading / Content / Empty / Error на всех списках.
- Focus management в модалках, видимый focus ring.
- Статусы не только цветом (иконки/текст).

### WEB-11. Тесты и финальная приёмка

Сделать:
- Unit tests для `domain/*` (24h rule, price, availability).
- Component tests для форм SCR-06, OTP SCR-02.
- Чеклист критериев приёмки из каждого SCR (P0).

## Чего клиент не делает

- Не создаёт/редактирует слоты, программы, шефов.
- Не показывает онлайн-оплату.
- Не реализует оценки шефов (Phase 2).
- Не пересчитывает серверные лимиты «вслепую» — при ошибке обновляет данные с API.

## Зависимость от BE

Клиент можно разрабатывать параллельно с MSW/mock по OpenAPI; интеграционные проверки — после готовности BE-07…BE-09.
