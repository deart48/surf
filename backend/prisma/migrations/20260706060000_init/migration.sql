-- Init migration — «Шеф-стол» backend.
-- Соответствует prisma/schema.prisma. CHECK-ограничения ниже дублируют инварианты
-- 01-analysis/4-design/data-model.md и 01-analysis/api/{slots,bookings,profile}
-- на уровне БД (последний рубеж защиты помимо транзакций/row-lock в сервисе).

-- PostgreSQL 13+ имеет встроенный gen_random_uuid(), extension не требуется.

-- --- Enums -----------------------------------------------------------------

CREATE TYPE "ProgramType" AS ENUM ('novice', 'experienced');
CREATE TYPE "SlotStatus" AS ENUM ('scheduled', 'cancelled');
CREATE TYPE "BookingStatus" AS ENUM ('active', 'cancelled', 'late_cancel', 'studio_cancelled');
CREATE TYPE "PushPlatform" AS ENUM ('web', 'ios', 'android');

-- --- Programs / Chefs (read-only справочники) -------------------------------

CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "type" "ProgramType" NOT NULL,
    "duration_min" INTEGER NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id"),
    -- FR-5: длительность класса положительна (~180 мин, «около 3 часов»).
    CONSTRAINT "programs_duration_min_check" CHECK ("duration_min" > 0)
);

CREATE TABLE "chefs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,

    CONSTRAINT "chefs_pkey" PRIMARY KEY ("id")
);

-- --- Slots (read-only проекция, счётчики пересчитывает бэкенд) -------------

CREATE TABLE "slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "chef_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(3) NOT NULL,
    "total_seats" INTEGER NOT NULL,
    "free_seats" INTEGER NOT NULL,
    "free_rental_sets" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "rental_price" INTEGER NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slots_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id"),
    CONSTRAINT "slots_chef_id_fkey" FOREIGN KEY ("chef_id") REFERENCES "chefs"("id"),

    -- FR-9: вместимость класса в людях, ≤ вместимость стола (12 столов × до 6 человек).
    CONSTRAINT "slots_total_seats_check" CHECK ("total_seats" BETWEEN 1 AND 6),
    -- free_seats никогда не превышает total_seats и не уходит в минус (data-model → инварианты).
    CONSTRAINT "slots_free_seats_check" CHECK ("free_seats" >= 0 AND "free_seats" <= "total_seats"),
    -- FR-10: прокатный фонд учитывается ОТДЕЛЬНО от мест, до 6 комплектов на стол.
    CONSTRAINT "slots_free_rental_sets_check" CHECK ("free_rental_sets" BETWEEN 0 AND 6),
    -- Цены неотрицательны (data-model → инварианты); своя экипировка бесплатна, но не отрицательна.
    CONSTRAINT "slots_price_check" CHECK ("price" >= 0),
    CONSTRAINT "slots_rental_price_check" CHECK ("rental_price" >= 0)
);

CREATE INDEX "slots_start_at_idx" ON "slots"("start_at");
CREATE INDEX "slots_status_idx" ON "slots"("status");
CREATE INDEX "slots_program_id_idx" ON "slots"("program_id");
CREATE INDEX "slots_chef_id_idx" ON "slots"("chef_id");

-- --- Clients -----------------------------------------------------------------

CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100),
    "phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
    -- FR-2: телефон — логин в формате E.164 (^\+[1-9]\d{1,14}$, auth/models.yaml).
    CONSTRAINT "clients_phone_format_check" CHECK ("phone" ~ '^\+[1-9]\d{1,14}$')
);

CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- --- Bookings ------------------------------------------------------------

CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "seats_count" INTEGER NOT NULL,
    "rental_count" INTEGER NOT NULL,
    "allergies" VARCHAR(500),
    "status" "BookingStatus" NOT NULL DEFAULT 'active',
    "price_total" INTEGER NOT NULL,
    "cancel_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMPTZ(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id"),
    CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id"),

    -- FR-8/FR-9: 1..6 мест (себя + до 5 гостей, один стол).
    CONSTRAINT "bookings_seats_count_check" CHECK ("seats_count" BETWEEN 1 AND 6),
    -- FR-10: 0..seats_count прокатных комплектов (своя экипировка занимает место, но не фонд).
    CONSTRAINT "bookings_rental_count_check" CHECK ("rental_count" >= 0 AND "rental_count" <= "seats_count"),
    -- FR-13: итоговая цена неотрицательна (считает сервер, клиент её не пишет).
    CONSTRAINT "bookings_price_total_check" CHECK ("price_total" >= 0),
    -- Модель состояний (data-model.md): cancelled_at обязателен ровно для терминальных статусов.
    CONSTRAINT "bookings_cancelled_at_consistency_check" CHECK (
        ("status" = 'active' AND "cancelled_at" IS NULL)
        OR ("status" != 'active' AND "cancelled_at" IS NOT NULL)
    ),
    -- R-008/FR-18: cancel_reason заполняется только при отмене студией, иначе NULL.
    CONSTRAINT "bookings_cancel_reason_consistency_check" CHECK (
        ("status" = 'studio_cancelled' AND "cancel_reason" IS NOT NULL)
        OR ("status" != 'studio_cancelled' AND "cancel_reason" IS NULL)
    )
);

CREATE INDEX "bookings_client_id_idx" ON "bookings"("client_id");
CREATE INDEX "bookings_slot_id_idx" ON "bookings"("slot_id");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- --- Auth infrastructure -----------------------------------------------------

CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID,
    "phone" VARCHAR(20) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "otp_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id"),
    CONSTRAINT "otp_codes_phone_format_check" CHECK ("phone" ~ '^\+[1-9]\d{1,14}$'),
    CONSTRAINT "otp_codes_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX "otp_codes_phone_idx" ON "otp_codes"("phone");
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_client_id_idx" ON "refresh_tokens"("client_id");

CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "platform" "PushPlatform" NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id")
);

CREATE UNIQUE INDEX "push_tokens_client_id_token_key" ON "push_tokens"("client_id", "token");

CREATE TABLE "idempotency_keys" (
    "key" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "response_body" JSONB NOT NULL,
    "status_code" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Composite PK: ключ привязан к клиенту (LOGIC-004) — чужой Idempotency-Key
    -- не может быть переигран другим client_id.
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("client_id", "key"),
    CONSTRAINT "idempotency_keys_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id")
);
