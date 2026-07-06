# Ревью требования: ТЗ клиентского web-приложения «Шеф-стол» (`01-analysis/`)

## 1. Резюме

Проведено полное ревью аналитического пакета `01-analysis/`: бриф, требования, дизайн-брифы, модель данных, OpenAPI и детальное ТЗ (`5-web-app-spec/` — 10 экранов SCR-01…SCR-10, 9 логик LOGIC-001…009). Пакет в целом **согласован и пригоден к разработке**: доменные правила (лимиты мест/проката, идемпотентность, отмена 24 ч, офлайн-оплата) прослеживаются от FR/NFR до экранов и API; OpenAPI проходит `redocly lint` без ошибок.

Главные риски: **внутренние противоречия вокруг поля «Имя» на SCR-01** (клиент не знает «новизну» до `verifyAuthCode`), **не зафиксированы часовой пояс студии и хранение токенов в web**, **пробелы в push-контракте** (payload уведомлений, VAPID/Service Worker), **расхождение sequence-диаграммы createBooking с OpenAPI** по полям ошибки 409, а также **отсутствующие артефакты** (отчёт дизайн-ревью, юридические тексты, явное бизнес-правило `double_booking`). Черновик `web/` в репозитории частично расходится с ТЗ (упрощённая форма брони, нет поля имени на входе, хардкод OTP/таймера).

---

## 2. Импакт-анализ — spec-level (артефакты `01-analysis/`)

| Затронутый модуль | Описание импакта | Источник | Риск |
| :-- | :-- | :-- | :-- |
| **SCR-01, SCR-02, LOGIC-001, LOGIC-002** | Вход по телефону + OTP, дозаполнение имени, сессия, silent refresh, route guard — затрагивают все АЗ-экраны | `5-web-app-spec/SCR-01_вход-телефон.md:41-47`, `LOGIC-002_сессия-и-авторизация.md:50-57` | high |
| **SCR-03, SCR-04, LOGIC-007, LOGIC-008** | Каталог слотов: дефолт 7 дней, фильтры, пагинация; справочники только на SCR-04 | `SCR-03_список-классов.md:43-44`, `api/slots/api.yaml:38-41` | medium |
| **SCR-05, SCR-06, LOGIC-003, LOGIC-004** | Ядро MVP: карточка → бронирование с лимитами, живой пересчёт, `Idempotency-Key`, ветки 201/409/410/422 | `SCR-06_оформление-записи.md:41-43`, `createBooking-sequence.md:16-20` | **high** |
| **SCR-07, SCR-10, LOGIC-009** | Push после записи и в профиле; `reminder_hours` с сервера | `LOGIC-009_регистрация-push-токена.md:31-33`, `api/bookings/models.yaml:153-163` | medium |
| **SCR-08, SCR-09, LOGIC-005, LOGIC-006** | Список/детали броней, группировка «прошедший», отмена 24 ч, `studio_cancelled` | `SCR-09_детали-брони-отмена.md:42-46`, `data-model.md:174-197` | **high** |
| **OpenAPI (5 доменов)** | Канонический контракт для BE/FE; коды ошибок в `common/models.yaml` | `api/redocly.yaml`, `api/common/models.yaml:14-61` | medium |
| **Модель данных** | Инварианты мест/проката, статусы, read-only слоты | `4-design/data-model.md:221-229` | high |

### Переиспользуемые логики и зависимости

| Логика | Где ещё используется | Риск регресса |
| :-- | :-- | :-- |
| **LOGIC-002** (сессия) | Все SCR-03…SCR-10; пересекается с LOGIC-009 (очистка push при logout) | Изменение хранения токенов ломает весь АЗ |
| **LOGIC-003** (пересчёт брони) | Только SCR-06; зависит от актуального `getSlot` | Расхождение с LOGIC-004 при 409 |
| **LOGIC-004** (идемпотентность) | SCR-06; связан с `createBooking-sequence.md` | Ошибка в ключе → дубли/потеря брони |
| **LOGIC-005** (24 ч) | SCR-09; дублируется микротекстом на SCR-06, SCR-07 | Гонка порога 24 ч → недовольство клиента |
| **LOGIC-007** (фильтры) | SCR-03 + SCR-04; сброс пагинации (LOGIC-008) | Несогласованность URL/state фильтров |
| **LOGIC-008** (пагинация) | SCR-03, SCR-08 | Дедуп/offset при быстрой прокрутке |
| **LOGIC-001** (OTP-таймер) | SCR-01, SCR-02 | Хардкод `resend_after_seconds` на клиенте vs ответ API |

**Code-level анализ по нативным платформам не проводился** — в скоупе только web (NFR-1, BR-6).

---

## 3. Импакт-анализ — WEB

### Spec-level (ожидаемое поведение web)

| Компонент | Импакт | Источник | Риск |
| :-- | :-- | :-- | :-- |
| Адаптив desktop / mobile web | SCR-04: bottom sheet vs боковая панель; SCR-05/06/09: sticky CTA | `SCR-04_фильтры.md:45`, `3-design-brief/README.md:38` | medium |
| Web Push | `Notification.permission`, Service Worker, `registerPushToken` / `deletePushToken` | `LOGIC-009_регистрация-push-токена.md:84-102` | **high** (пробел в ТЗ) |
| OTP web-специфика | `autocomplete="one-time-code"`, вставка из буфера, числовая клавиатура | `SCR-02_подтверждение-otp.md:277-286` | low |
| Deep links | `/login`, `/classes`, `/booking/{slotId}`, `/bookings/{bookingId}` | `SCR-01_вход-телефон.md:69`, `SCR-06_оформление-записи.md:65` | medium |
| Доступность | live-region для цены (SCR-06), фокус-ловушка диалога отмены (SCR-09) | `SCR-06_оформление-записи.md:339`, `SCR-09_детали-брони-отмена.md:347` | medium |

### Code-level (`surf/web/` — черновик реализации)

Локальный WEB-клон **доступен** (`surf/web/`). Выявленные расхождения с ТЗ:

| Область | ТЗ | Код | Источник |
| :-- | :-- | :-- | :-- |
| Поле «Имя» на входе | Обязательное поле на SCR-01 для новых | Только телефон на `LoginPage` | `SCR-01_вход-телефон.md:205-227` vs `web/src/features/auth/LoginPage.tsx:84-109` |
| Имя нового клиента | Шаг на SCR-02 после `is_new` | Реализовано на `OtpPage` | `web/src/features/auth/OtpPage.tsx:22-23,69-70` — **ближе к логике, чем к SCR-01** |
| Экипировка по местам | Список рядов «Место N» с переключателем своя/прокат | Два счётчика `seatsCount` / `rentalCount` | `SCR-06_оформление-записи.md:300-314` vs `web/src/features/booking/BookingFormPage.tsx:22-23` |
| OTP: длина кода | `^\d{4,6}$` с бэкенда | Фиксировано 4 цифры | `SCR-02_подтверждение-otp.md:148` vs `web/src/features/auth/OtpPage.tsx:9` |
| Таймер resend | Из `RequestCodeResponse.resend_after_seconds` | Хардкод `RESEND_SECONDS = 60` | `LOGIC-001` vs `web/src/features/auth/OtpPage.tsx:10` |
| Код ошибки 410 | `slot_cancelled` (OpenAPI enum) | `SLOT_CANCELLED` (верхний регистр) | `api/common/models.yaml:20` vs `web/src/features/booking/BookingFormPage.tsx:69` |
| `reminder_hours` | Не хардкодить; брать с сервера | Текст «за 24 часа» захардкожен | `LOGIC-009_регистрация-push-токена.md:94` vs `web/src/features/booking/BookingSuccessPage.tsx:64` |

---

## 4. Связанные зависимости и контекст

- **Трассировка FR → экраны** зафиксирована в `5-web-app-spec/README.md:76-94` — покрытие MVP полное для Must-требований.
- **Use cases UC-1…UC-5** согласованы с экранами; альтернативы и исключения (E1–E4 бронирования, A1 поздняя отмена) отражены в SCR-06/SCR-09 и `createBooking-sequence.md`.
- **Существующая инфраструктура (black-box)** — слоты/шефы/программы read-only; отмена слота студией и push массово — вне клиентского скоупа, но UI должен реагировать (`studio_cancelled`, 410).
- **Планы разработки** (`02-development/`) опираются на этот пакет; изменения в ТЗ потребуют синхронизации чеклистов BE/FE.
- **Отсутствующие артефакты** (явные пробелы, не выдумывались):
  - `01-analysis/3-design-brief/` — **нет отчёта дизайн-ревью** (упоминается в `rewiew-promt.md`, файла нет).
  - **Нет юридических текстов** (политика ПДн / условия) для ссылки на SCR-01 (`SCR-01_вход-телефон.md:232`, открытый вопрос в дизайн-брифе `3-design-brief/SCR-01_вход-телефон.md:109`).
  - **Нет спецификации payload push-уведомлений** (`booking_reminder`, `studio_cancelled` упомянуты в `SCR-09_детали-брони-отмена.md:70-71`, в OpenAPI отсутствуют).
  - В `rewiew-promt.md` устаревшие пути: `5-mobile-app-spec/`, `customer-brief.md` — фактически `5-web-app-spec/`, `0-customer-brief/brief-cooking.md`.

---

## 5. Расхождения desktop web vs mobile web

В скоупе **нет нативного мобильного приложения** (NFR-1, BR-6). Релевантные различия — внутри web:

| Тема | Desktop web | Mobile web | Источник |
| :-- | :-- | :-- | :-- |
| Фильтры SCR-04 | Боковая панель без затемнения | Bottom sheet / fullscreen, свайп вниз | `SCR-04_фильтры.md:45,104-107` |
| CTA записи SCR-05/06 | В потоке контента | Sticky снизу | `3-design-brief/SCR-05_карточка-класса.md:104` |
| Диалог отмены SCR-09 | Модальное окно | Bottom sheet + свайп | `SCR-09_детали-брони-отмена.md:354` |
| OTP | Enter подтверждает | Числовая клавиатура, автозаполнение SMS | `3-design-brief/SCR-02_подтверждение-otp.md:38` |
| Push | Поддержка зависит от браузера (Chrome/Edge/Firefox) | iOS Safari — ограниченная поддержка Web Push | `LOGIC-009` + `3-design-brief/SCR-10_профиль.md:73` — **не формализовано в ТЗ** |

---

## 6. Противоречия и тонкости

1. **Поле «Имя» на SCR-01 vs момент определения «нового» клиента**  
   SCR-01 требует непустое имя «при первом входе» и блокирует кнопку (`SCR-01_вход-телефон.md:227-243`, AC-N03), но «новизна» определяется только на SCR-02 через `is_new` (`SCR-01_вход-телефон.md:47`, `SCR-02_подтверждение-otp.md:45`). Для returning user имя не нужно (AC-E04), но UI не может это знать заранее.  
   **Severity: high** | ТЗ SCR-01 / SCR-02 / FR-1

2. **Имена operationId в модели данных**  
   `data-model.md:29` указывает `requestOtp`, `verifyOtp`; везде в ТЗ и OpenAPI — `requestAuthCode`, `verifyAuthCode`.  
   **Severity: medium** | `4-design/data-model.md:29` vs `api/auth/api.yaml:29,74`

3. **Поля ошибки 409 createBooking: sequence vs OpenAPI vs ТЗ**  
   `createBooking-sequence.md:50` — `free_seats` / `free_rental_sets` в теле 409; OpenAPI и SCR-06/LOGIC-004 — `details.available_seats` / `details.available_rental_sets` (`api/common/models.yaml:54-60`).  
   **Severity: medium** | `4-design/createBooking-sequence.md:19,50` vs `5-web-app-spec/SCR-06_оформление-записи.md:208`

4. **Часовой пояс отображения и граница 24 ч**  
   `start_at` в UTC (`api/slots/models.yaml:60`, `data-model.md:72`); клиент показывает в «локальной зоне студии», но **IANA timezone студии нигде не задан**. LOGIC-005 использует клиентский `now` для подсказки (`SCR-09_детали-брони-отмена.md:90`), вердикт — на сервере. Риск расхождения UI-подсказки и фактического `cancelled`/`late_cancel`.  
   **Severity: high** | `4-design/data-model.md:72`, `SCR-09_детали-брони-отмена.md:304-305`, AC-E02

5. **«Защищённое хранилище» токенов без web-конкретики**  
   LOGIC-002 требует «защищённое хранилище» (`LOGIC-002_сессия-и-авторизация.md:181-188`), но не выбирает механизм для SPA (httpOnly cookie vs `sessionStorage`/`localStorage`). NFR-7 не закрывает вопрос XSS.  
   **Severity: high** | `LOGIC-002_сессия-и-авторизация.md:181-188`, NFR-7

6. **Правило `double_booking` не выведено в FR/UC**  
   Код ошибки и UI есть (`api/common/models.yaml:19`, `SCR-06_оформление-записи.md:201`), но в FR/UC не сказано явно: «один клиент — одна активная бронь на слот» или «запрет второй брони с другим составом». Неясно, можно ли увеличить места повторной бронью.  
   **Severity: medium** | `api/common/models.yaml:19`, `5-web-app-spec/09_Логики/LOGIC-004_идемпотентное-создание-брони.md:108`

7. **Отменённые студией слоты в каталоге**  
   API включает `status=cancelled` в `listSlots` (`api/slots/api.yaml:40-41`). ТЗ SCR-03: показывать с меткой (`SCR-03_список-классов.md:271`). Дизайн-бриф SCR-03: «в каталоге предстоящих не предлагаются к записи» (`3-design-brief/SCR-03_список-классов.md:72`) — двусмысленность: скрывать или показывать.  
   **Severity: low** | `SCR-03_список-классов.md:271` vs `3-design-brief/SCR-03_список-классов.md:72`

8. **Бриф заказчика vs web-first**  
   В `brief-cooking.md:48` уточнение всё ещё говорит «клиентское **мобильное** приложение»; домен и NFR-1 — web.  
   **Severity: low** | `0-customer-brief/brief-cooking.md:48` vs `2-requirements/non-functional-requirements.md:14`

9. **Демо-код OTP в production**  
   SCR-01 передаёт `code` из `RequestCodeResponse` в навигацию (`SCR-01_вход-телефон.md:78,155`); в production поле не должно приходить — нужна явная ветка «только dev/staging».  
   **Severity: medium** | `SCR-01_вход-телефон.md:85,155`, `SCR-02_подтверждение-otp.md:85`

10. **Web Push: нет инфраструктурной спецификации**  
    LOGIC-009 описывает UX, но не VAPID, Service Worker, формат subscription JSON, обработку `push` event и deep link из уведомления.  
    **Severity: high** | `LOGIC-009_регистрация-push-токена.md:84-102`, `SCR-09_детали-брони-отмена.md:70-71`

11. **Приоритет FR-19 (Should) vs NFR-9 (Средний) vs BR-3 (Must)**  
    Push-напоминание формально Should в FR-19, но BR-3 и метрика M-3 завязаны на снижение неявок через напоминания. Риск недооценки при срезании MVP.  
    **Severity: medium** | `functional-requirements.md:63`, `business-requirements.md:16`, `non-functional-requirements.md:22`

12. **Реализация `web/` vs SCR-06 (экипировка)**  
    ТЗ: выбор экипировки **для каждого места** (FR-7); код: агрегированный `rentalCount`. Функционально эквивалентно для лимитов, но **не соответствует UX-спецификации и UC-2 шаг 3**.  
    **Severity: medium** | `SCR-06_оформление-записи.md:300-314` vs `web/src/features/booking/BookingFormPage.tsx:22-23`

---

## 7. Вопросы к ВА

1. **Где собирать имя нового клиента?** Только на SCR-02 после `is_new=true`, или оставляем поле на SCR-01 (и как тогда не блокировать returning user)?  
   Контекст: п.1 раздела 6. | **Приоритет: high** | **Категория: contradiction**

2. **Какой IANA timezone у студии «Шеф-стол»** для отображения `start_at` и человекочитаемых дедлайнов «бесплатная отмена до …»?  
   Контекст: п.4 раздела 6. | **Приоритет: high** | **Категория: missing**

3. **Может ли один клиент иметь более одной активной брони на один слот** (разные `seats_count`), или `double_booking` запрещает любую вторую бронь?  
   Контекст: п.6 раздела 6. | **Приоритет: high** | **Категория: ambiguity**

4. **Показывать ли в каталоге (SCR-03) слоты со `status=cancelled`**, или исключать их на бэкенде/фильтром клиента?  
   Контекст: п.7 раздела 6. | **Приоритет: medium** | **Категория: ambiguity**

5. **Где размещены тексты политики обработки ПДн / условий** для ссылки на SCR-01 (URL, отдельный документ, внешний сайт)?  
   Контекст: `SCR-01_вход-телефон.md:232`, дизайн-бриф SCR-01 §11. | **Приоритет: medium** | **Категория: missing**

6. **Какая стратегия хранения JWT в web-SPA** (httpOnly refresh + memory access vs localStorage)? Есть ли требования compliance?  
   Контекст: п.5 раздела 6, NFR-7. | **Приоритет: high** | **Категория: missing**

7. **Нужна ли отдельная спецификация Web Push** (VAPID, SW, payload `booking_reminder` / `studio_cancelled`, deep link)?  
   Контекст: п.10 раздела 6. | **Приоритет: high** | **Категория: missing**

8. **Длина OTP**: фиксированно 4, 6 или диапазон 4–6 (`VerifyCodeRequest`)?  
   Контекст: `SCR-02_подтверждение-otp.md:148` vs `web/src/features/auth/OtpPage.tsx:9`. | **Приоритет: medium** | **Категория: clarification**

9. **Push-напоминание — Must или Should для MVP?** Согласовать FR-19 с BR-3 / M-3.  
   Контекст: п.11 раздела 6. | **Приоритет: medium** | **Категория: contradiction**

10. **Нужен ли индикатор «до класса <24 ч» в списке броней (SCR-08)?** Открытый вопрос дизайн-брифа.  
    Контекст: `3-design-brief/SCR-08_мои-бронирования.md:128`. | **Приоритет: low** | **Категория: clarification**

---

## 8. Комментарии к ревью

**Сильные стороны пакета**

- Единый слой доменных правил в `5-web-app-spec/README.md:31-43` — хорошая «шапка» для всех экранов.
- Детализация SCR-06/SCR-09 и LOGIC-004/LOGIC-005 с критериями приёмки «Дано/Когда/Тогда» — уровень, достаточный для QA.
- OpenAPI согласован с ТЗ по кодам ошибок (`slot_full`, `rental_unavailable`, `idempotency_key_conflict`); lint проходит.
- Явное разделение «подсказка на клиенте / вердикт на сервере» для отмены — правильная архитектурная линия.

**Рекомендации до старта разработки**

1. Синхронизировать SCR-01 и SCR-02 по имени: убрать обязательность имени с SCR-01 **или** сделать поле условным после неудачной попытки без имени (рекомендуется перенос на SCR-02 — как в текущем `web/OtpPage`).
2. Исправить `data-model.md` и `createBooking-sequence.md` под канонические `operationId` и `details.available_*`.
3. Добавить в NFR или LOGIC-002 подраздел «Web: хранение сессии»; в домен — `studio_timezone`.
4. Вынести мини-спеку push (хотя бы в `4-design/` или `api/`) с типами уведомлений и полями payload.
5. Подготовить заглушку/URL для юридической сноски SCR-01.
6. Обновить `brief-cooking.md:48` («web-приложение» вместо «мобильное»).
7. Привести `web/` к ТЗ или зафиксировать осознанные упрощения MVP в `02-development/CLIENT_UI_IMPLEMENTATION_PLAN.md`.

**Методология**

- Прочитаны: README этапов, все FR/BR/NFR, use cases, data-model, createBooking-sequence, OpenAPI (5 доменов), README и все SCR/LOGIC в `5-web-app-spec/`, выборочно дизайн-брифы и `brief-cooking.md`.
- Поиск по ключевым ID (`SCR-*`, `LOGIC-*`, `operationId`, `available_seats`, `double_booking`) выполнен по `01-analysis/`.
- Сверка с кодом: `surf/web/` (черновик, не часть `01-analysis/`, но в том же репозитории `surf`).

---

*Отчёт подготовлен по методологии `rewiew-promt.md`. Дата ревью: 2026-07-06.*
