# Анализ · «Шеф-стол»

Артефакты аналитика по проекту кулинарной студии. Структура повторяет классический процесс: от входа заказчика до ТЗ, передаваемого в разработку.

## Маршрут по этапам

| Этап | Папка | Что внутри |
| :-- | :-- | :-- |
| **Вход** | [0-customer-brief/](0-customer-brief/) | [brief-cooking.md](0-customer-brief/brief-cooking.md) — сырой бриф заказчика |
| **1. Выявление требований** | [1-elicitation/](1-elicitation/) | [customer-questions.md](1-elicitation/customer-questions.md), [domain-description.md](1-elicitation/domain-description.md) |
| **2. Описание требований** | [2-requirements/](2-requirements/) | [business](2-requirements/business-requirements.md) · [functional](2-requirements/functional-requirements.md) · [non-functional](2-requirements/non-functional-requirements.md) · [user-stories](2-requirements/user-stories.md) · [use-cases](2-requirements/use-cases.md) |
| **Бриф для дизайна** | [3-design-brief/](3-design-brief/) | [README](3-design-brief/README.md) — постановки SCR-01…SCR-10 для UI/UX |
| **3. Проектирование** | [4-design/](4-design/) | [data-model.md](4-design/data-model.md), [createBooking-sequence.md](4-design/createBooking-sequence.md) |
| **4. ТЗ** | [5-web-app-spec/](5-web-app-spec/) | [README](5-web-app-spec/README.md) — экраны SCR-01…SCR-10, логики LOGIC-001…009 |
| **API (OpenAPI)** | [api/](api/) | [redocly.yaml](api/redocly.yaml) — домены: `auth`, `slots`, `bookings`, `profile`, `catalog` |

## Реестр экранов (кратко)

| ID | Экран | ТЗ |
| :-- | :-- | :-- |
| SCR-01 | Вход: телефон | [SCR-01](5-web-app-spec/SCR-01_вход-телефон.md) |
| SCR-02 | Подтверждение OTP | [SCR-02](5-web-app-spec/SCR-02_подтверждение-otp.md) |
| SCR-03 | Список классов | [SCR-03](5-web-app-spec/SCR-03_список-классов.md) |
| SCR-04 | Фильтры | [SCR-04](5-web-app-spec/SCR-04_фильтры.md) |
| SCR-05 | Карточка класса | [SCR-05](5-web-app-spec/SCR-05_карточка-класса.md) |
| SCR-06 | Оформление записи | [SCR-06](5-web-app-spec/SCR-06_оформление-записи.md) |
| SCR-07 | Запись создана | [SCR-07](5-web-app-spec/SCR-07_запись-создана.md) |
| SCR-08 | Мои бронирования | [SCR-08](5-web-app-spec/SCR-08_мои-бронирования.md) |
| SCR-09 | Детали брони и отмена | [SCR-09](5-web-app-spec/SCR-09_детали-брони-отмена.md) |
| SCR-10 | Профиль | [SCR-10](5-web-app-spec/SCR-10_профиль.md) |

## Команды API-документации

Из корня репозитория:

```bash
npm --prefix 01-analysis/api install   # первый раз
npm --prefix 01-analysis/api run lint
npm --prefix 01-analysis/api run bundle
npm --prefix 01-analysis/api run preview
```

## Передача в разработку

Итоговый пакет: требования (`2-requirements/`) + модель данных (`4-design/data-model.md`) + OpenAPI (`api/`) + ТЗ (`5-web-app-spec/`). Планы реализации — в [../02-development/](../02-development/).
