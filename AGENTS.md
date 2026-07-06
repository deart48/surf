# AGENTS.md

## Repo State
- This repo currently contains BA/analysis artifacts for the «Шеф-стол» culinary studio project; BE/FE application code has not been created yet.
- Start from `README.md` and `01-analysis/README.md` for navigation; implementation plans live under `02-development/`.
- Preserve Russian requirement IDs and traceability links (`BR-*`, `FR-*`, `NFR-*`, `UC-*`, `SCR-*`, `LOGIC-*`) when changing docs or generating code.

## Source Of Truth
- Start with `01-analysis/5-web-app-spec/README.md` for the current client web app spec and screen inventory.
- Use `01-analysis/5-web-app-spec/*.md` and `01-analysis/5-web-app-spec/09_Логики/*.md` for screen flows, API operationIds, validation, states, and acceptance criteria.
- Use `01-analysis/api/redocly.yaml` plus domain files under `01-analysis/api/{auth,slots,bookings,profile,catalog}/` for API contracts.
- Use `01-analysis/2-requirements/` for requirements and `01-analysis/4-design/data-model.md` for resource model and invariants.
- Use `01-analysis/4-design/createBooking-sequence.md` for booking error mapping and sequence flows.
- There is no single `openapi.yaml`; use the multi-file OpenAPI domains registered in `redocly.yaml`.

## Target Implementation Constraints
- BE target stack: **NestJS** (Node.js 22+, TypeScript), RESTful JSON API aligned to the existing OpenAPI contracts.
- BE persistence: PostgreSQL 16, **Prisma** for schema/migrations; row-level locking in transactions for booking flows.
- BE performance testing target: k6 load tests sized for up to 300 concurrent users, especially booking/cancel concurrency.
- FE target stack: TypeScript SPA (**React 19 + Vite**) as a responsive web application for desktop and mobile browsers (NFR-1).
- FE data layer: TanStack Query for server state; `openapi-typescript` + `openapi-fetch` (or equivalent) for typed API client.
- Do not introduce a different primary BE/FE stack unless the user explicitly asks.

## Backend Architecture Baseline (NestJS)
- Use a classic layered architecture: **Controller → Service (use case) → Domain → Repository/Prisma**.
- Keep the backend in `backend/` as a NestJS application (`nest new` or equivalent scaffold).
- Organize by feature modules aligned to API domains, not by technical layer only.
- Recommended layout:
  - `src/main.ts`: bootstrap, global pipes/filters, graceful shutdown.
  - `src/app.module.ts`: root module composition.
  - `src/modules/auth/`: OTP, JWT, refresh, logout, push tokens.
  - `src/modules/profile/`: get/update profile.
  - `src/modules/catalog/`: read-only chefs and programs.
  - `src/modules/slots/`: read-only list/get slot.
  - `src/modules/bookings/`: create, list, get, cancel — core transactional logic.
  - `src/domain/`: pure policies — `CancellationPolicy`, `BookingLimits`, `PriceCalculator`; no Nest/Prisma imports.
  - `src/infrastructure/prisma/`: PrismaService, repositories, `$transaction` helpers.
  - `src/infrastructure/otp/`: OTP generation, hash storage, dev provider (log code).
  - `src/infrastructure/clock/`: injectable time source for 24h cancellation boundary tests.
  - `src/common/`: guards (`JwtAuthGuard`), filters (exception → OpenAPI error shape), interceptors (request id, idempotency key).
  - `prisma/schema.prisma` + `prisma/migrations/` + `prisma/seed.ts`.
- Dependency direction must point inward: controllers depend on services, services depend on domain abstractions/repository interfaces, infrastructure implements interfaces. Domain must not import Nest decorators, Prisma client, or HTTP types.
- Controllers stay thin: DTO validation (`class-validator`), call one service method, map result/errors to OpenAPI-compatible responses.
- Keep OpenAPI `operationId` names in controller method names or route handlers for traceability; align DTOs with `01-analysis/api` schemas.
- Use explicit mapping between transport DTOs, service commands/results, and domain entities where they differ.
- Put business invariants in services/domain, not in controllers or Prisma schema alone. DB constraints and `$transaction` + `SELECT ... FOR UPDATE` must protect the same invariants at persistence level.
- Booking and cancellation flows must run inside explicit Prisma `$transaction` (or raw SQL) with row-level locking to prevent double booking, overbooking, and incorrect rental inventory updates.
- Implement idempotent `createBooking` via `Idempotency-Key` header + persisted keys bound to authenticated client and request payload semantics.
- Use Nest DI for all services; no global mutable state for config, logger, database, or clock.
- Logging: structured logs via `nestjs-pino` or `pino`; include request id.
- Tests: Jest (Nest default) — unit tests for domain policies, service tests with mocked repositories, e2e/supertest + testcontainers PostgreSQL for booking concurrency.

## Web Client Architecture Baseline
- Keep the SPA under `web/` with feature-oriented modules aligned to `SCR-*` screens.
- Use a thin API client layer mapped to OpenAPI operationIds; do not scatter raw fetch calls across UI components.
- Centralize session handling per `LOGIC-002`: access/refresh token storage, silent refresh on 401, route guards for authenticated zone (АЗ).
- Domain policies (availability limits, price preview, cancellation window) live in pure TypeScript modules under `web/src/domain/`, not in presentational components.
- Server state (slots, bookings, profile) — TanStack Query; local UI state — hooks or URL search params.
- Support responsive layouts per design brief §9 on each screen: desktop and mobile web variants (filters as side panel vs bottom sheet, sticky CTAs on mobile).
- Web Push registration follows `LOGIC-009`; degrade gracefully when unsupported or denied.
- Generate typed API models from bundled OpenAPI (`openapi-typescript`); shared types may live in a future `packages/api-contract` if monorepo is introduced.

## API Docs Commands
- API contract docs: `npm --prefix 01-analysis/api ...` from repo root.
- First-time setup: `npm --prefix 01-analysis/api install`; `package-lock.json` in that folder is intentionally ignored.
- Lint OpenAPI after contract changes: `npm --prefix 01-analysis/api run lint`.
- Bundle domain specs to ignored `dist/`: `npm --prefix 01-analysis/api run bundle`.
- Preview docs locally: `npm --prefix 01-analysis/api run preview`.
- Current domains: `auth`, `slots`, `bookings`, `profile`, `catalog`.

## MVP Scope Traps
- In scope: client role only, phone/OTP auth, slot list/filtering (7-day default), slot card, booking self plus up to 5 guests (max 6 seats), own/rental equipment choice, allergies field, own bookings, cancel booking, profile, reminders/push registration where specified.
- Out of scope: chef/owner/admin UI, schedule CRUD, slot creation/editing, chef ratings, public reviews, online payment, loyalty, no-show handling.
- Slots, programs, and chefs are read-only projections from existing infrastructure; client code/API must not create or edit them.
- Payment is offline; the product only shows price and records booking details.

## Domain Invariants To Protect
- Booking must be atomic and must prevent double booking and overbooking under parallel requests.
- `createBooking` supports `Idempotency-Key`; use it for safe retry after network failure.
- `seats_count` is 1..`min(free_seats, 6)` and `rental_count` is 0..`seats_count` and ≤ `free_rental_sets`; own equipment consumes a seat but not a rental set from inventory.
- Do not hardcode table caps or rental inventory in FE; use slot data even though docs mention 12 tables and up to 6 rental sets per table.
- Late cancellation is `< 24h` before slot start and does not free seats or rental sets; exactly `24h` is early cancellation and frees them.
- "Past" is derived from `slot.start_at`, not a stored status. Booking status is `active`, `cancelled`, `late_cancel`, or `studio_cancelled`; slot status is `scheduled` or `cancelled`.
- Client data access is only to the current user's profile/bookings; cross-client access must return forbidden/unauthorized behavior per common API responses.
- Re-booking on a studio-cancelled slot is forbidden (410 Gone / disabled CTA).
