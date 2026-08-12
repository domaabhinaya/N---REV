# NutriRecover

An AI-assisted nutritional deficiency recovery support platform — helps users identify possible nutrient gaps (protein, iron, calcium, vitamin B12, vitamin D) from symptoms, generates an Indian-food-friendly 30-day recovery meal plan, tracks daily meals, and shows progress. Not a diagnosis tool.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `PORT` env)
- `pnpm --filter @workspace/nutrirecover run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, wouter for routing, TanStack Query, recharts, shadcn/ui components
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/` — Drizzle schemas: `profiles`, `foods`, `mealLogs`, `labComparisons`
- `artifacts/api-server/src/lib/` — core domain logic: `recovery-engine.ts` (nutrient priority scoring from symptoms/labs), `meal-planner.ts` (30-day plan generation), `suggestion-engine.ts` (next-day suggestions), `lab-insights.ts` (lab comparison insights), `food-data.ts` (60-food Indian-diet seed catalog), `nutrition-calculator.ts`, `profile-service.ts`
- `artifacts/api-server/src/routes/` — Express routes: `profiles.ts`, `recovery.ts`, `foods.ts`, `mealLogs.ts`, `dashboard.ts`, `labs.ts`
- `artifacts/nutrirecover/src/pages/` — frontend pages: Home, Assessment, RecoveryPlan, Tracking, Suggestions, Dashboard, Labs

## Architecture decisions

- No DB table for recovery plans/targets — everything (nutrient priorities, daily targets, the 30-day meal plan) is computed deterministically on the fly from the profile + food catalog, not persisted.
- OpenAPI generated Zod schemas coerce `format: date` fields to `Date` objects; `artifacts/api-server/src/lib/date-utils.ts` provides `toDateString`/`todayStr` helpers to convert back to `YYYY-MM-DD` strings before DB inserts (DB date columns are strings).
- Orval-generated query hooks require `queryKey` to be passed explicitly alongside `enabled` in the `query` option object (the generated `UseQueryOptions` type doesn't default it) — always import the matching `getXxxQueryKey` helper when adding `enabled: ...` to a generated hook call.

## Product

- Intake/assessment form capturing symptoms, diet type, and optional lab values
- Rule-based recovery engine scoring nutrient priority (protein, iron, calcium, B12, vitamin D)
- 30-day Indian-food-friendly meal plan tailored to diet type and priorities
- Daily meal tracking with progress vs. targets
- Next-day food suggestions based on missed nutrients
- Progress dashboard with weekly nutrient trends
- Optional lab value comparison (baseline vs. follow-up) with insights

Never uses "diagnosis" language — uses "possible nutrient gap" / "recovery nutrition support" throughout, with a visible disclaimer that this is not a substitute for professional medical advice.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- When adding `enabled` to a generated TanStack Query hook's `query` option, also pass the matching `getXxxQueryKey(...)` as `queryKey` or typecheck will fail.
- Route handlers must convert date fields with `toDateString`/`todayStr` from `lib/date-utils.ts` before inserting into date columns.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
