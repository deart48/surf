# Проверка критерия «Реализовать хотя бы 3 фичи»

> Основание: импакт-анализ из [`requirements-impact-review.md`](requirements-impact-review.md) (раздел 2)  
> Объект проверки: `web/` + `backend/` в репозитории `surf`  
> Дата: 2026-07-06

## Вывод

**Критерий выполнен.** Реализовано **5 из 5** ключевых фичевых блоков MVP (push — упрощённая реализация без Service Worker / VAPID).

## Матрица фич

| # | Фича (импакт-ревью) | Экраны / логики | Статус | Доказательство в коде |
| :-- | :-- | :-- | :--: | :-- |
| 1 | Авторизация | SCR-01/02, LOGIC-001/002 | ✅ | `web/src/features/auth/LoginPage.tsx`, `OtpPage.tsx`, `web/src/app/SessionContext.tsx` |
| 2 | Каталог слотов | SCR-03/04, LOGIC-007/008 | ✅ | `web/src/features/catalog/ClassesListPage.tsx`, `FiltersSheet.tsx`, `SlotCardPage.tsx` |
| 3 | Бронирование | SCR-05/06, LOGIC-003/004 | ✅ | `web/src/features/booking/BookingFormPage.tsx` — `Idempotency-Key`, live-пересчёт цены |
| 4 | Мои брони + отмена | SCR-08/09, LOGIC-005/006 | ✅ | `MyBookingsPage.tsx`, `BookingDetailsPage.tsx` — модалка отмены 24 ч |
| 5 | Профиль + push | SCR-07/10, LOGIC-009 | ⚠️ | `ProfilePage.tsx`, `BookingSuccessPage.tsx` — push best-effort (`Notification.requestPermission`), без полноценного Web Push |

## Дополнительные признаки готовности

- Все 10 экранов SCR-01…SCR-10 связаны роутингом: `web/src/App.tsx`
- Web-клиент подключён к NestJS backend: `web/src/api/endpoints.ts` (ранее mock-слой заменён на HTTP)
- Сборка web проходит: `npm run build` в `web/` (tsc + vite)
- Backend domain unit-тесты: 18/18 passed (`npm test` в `backend/`)

## Оговорки (не блокируют критерий «≥ 3 фичи»)

| Область | Расхождение с ТЗ | Источник |
| :-- | :-- | :-- |
| Push | Нет Service Worker / VAPID; синтетический токен `web-{uuid}` | `requirements-impact-review.md` §3, `endpoints.ts:registerPushTokenMock` |
| SCR-06 UX | Агрегированный `rental_count`, не переключатель «своё/прокат» по местам | `requirements-impact-review.md` §3, п.12 |
| SCR-04 | Единая модалка фильтров вместо bottom sheet / боковой панели | `CLIENT_UI_IMPLEMENTATION_PLAN.md` |
| Имя на входе | Сбор имени на SCR-02 после `is_new`, не на SCR-01 | Осознанное отклонение в плане UI |

## Связанные артефакты

- [Тест-кейсы](test-cases.md)
- [Баг-репорт](bug-report.md)
- [Ревью требований](requirements-impact-review.md)
