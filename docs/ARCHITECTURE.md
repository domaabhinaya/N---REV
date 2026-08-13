# Architecture

A deterministic, rule-based nutrition engine backed by a curated USDA-anchored
food dataset. The repository is a pnpm workspace monorepo; see
[the project README](../README.md) for the user-facing overview. There are no
generative models in the loop - every output is reproducible from the dataset
and the recovery rules.

## Monorepo Layout

```
N-REV/
├── artifacts/              # build outputs: runnable api-server + packaged frontend
├── docs/                   # ARCHITECTURE.md, FOOD_DATASET_AUDIT.md
├── lib/                    # shared, versioned building blocks
│   ├── api-spec/           # OpenAPI 3.1 source of truth + Orval codegen
│   ├── dataset/            # curated food dataset + audit/migration scripts
│   └── db/                 # Drizzle schema, migrations, db tooling
├── scripts/                # standalone Node scripts
├── nutrirecover/           # frontend app (React 19 + Vite)
├── pnpm-workspace.yaml     # workspace config
├── tsconfig.base.json      # shared TypeScript settings
└── package.json            # root scripts (dev/build/deploy)
```

Workspaces: `@workspace/api-server` (`artifacts/api-server`), `nutrirecover`
(`artifacts/nutrirecover`), and the `lib/*` libraries. Cross-workspace
dependencies are wired through pnpm `workspace:` protocol and the generated API
client.

## Backend (api-server)

The API server (`artifacts/api-server/src`) is an Express 5 application written
in TypeScript and bundled with esbuild.

```
src/
├── index.ts              # process entry; loads env, starts http server
├── app.ts                # Express app: middleware, routes, error handling
├── lib/
│   ├── load-env.ts       # dotenv-safe config + validation of env vars
│   ├── logger.ts         # Pino logger with redaction
│   ├── food-lookup.ts    # food-dataset queries (rank foods, filter, tag)
│   └── food-classifier.ts# diet/allergy suitability + cuisine affinity
└── routes/
    ├── index.ts          # route registry / health
    ├── health.ts         # /api/health
    ├── profiles.ts       # CRUD on user assessment/profiles
    ├── ai.ts             # profile-grounded assistant (deterministic)
    └── admin.ts          # /api/admin/* (guarded by ADMIN_SECRET_KEY)
```

`food-classifier.ts` and `food-lookup.ts` are the bridge between the recovery
engine and the food dataset: they answer "which foods are suitable for this
diet/allergy?" and "what are the best food sources of nutrient X?". The server
listens on `PORT` (default `8099`); the Vite dev server proxies `/api` to
`http://127.0.0.1:8099`.

## Frontend (nutrirecover)

`artifacts/nutrirecover` is a React 19 + Vite app (production build emits static
assets that the api-server serves). Routing is via Wouter; server state via
TanStack Query; styles are Tailwind + shadcn/ui; charts use Recharts.

- `src/pages/AiAssistant.tsx` - the profile-grounded chat assistant.
- The API client is generated from the OpenAPI spec with Orval
  (`lib/api-spec`), so requests/responses and types stay in lock-step with the
  backend contract. Zod provides runtime validation on the server.

## Shared Libraries

- `lib/api-spec` - OpenAPI 3.1 (`openapi.yaml`) is the single source of truth.
  `orval.config.ts` regenerates a typed React Query client; the frontend imports
  that client, so the contract is enforced at both ends.
- `lib/dataset` - the curated food dataset (USDA-anchored) plus the audit tool
  (`_audit_db.cjs`) and the USDA import/migration scripts (`_backfill.cjs`,
  `_migrate.cjs`). This is the source of truth for nutrient density, allergen
  tags, and the food-nutrient interaction table.
- `lib/db` - Drizzle ORM schema (`src/schema/foods.ts`,
  `src/schema/profiles.ts`) and database tooling. The schema lives here so both
  the api-server and db scripts share a single type-safe definition.

## Data Flow

1. The frontend calls the API through the generated Orval client.
2. Request payloads are validated with Zod (mirroring the OpenAPI schema) and
   persisted with Drizzle against PostgreSQL.
3. `profiles.ts` stores the structured intake (symptoms, labs, preferences).
4. The recovery engine maps symptoms + optional labs to a
   `high / medium / low` nutrient-priority list with daily targets.
5. The meal planner consults the food dataset (`food-lookup.ts`) to build a
   deterministic 30-day plan, filtered by diet type, allergies, budget, and
   cuisine preference.
6. The nutrition calculator scores logged meals against daily targets in
   real time.
7. The suggestion engine proposes next-day additions for missed nutrients.
8. `lab-insights.ts` compares baseline vs follow-up labs and emits insight text.
9. `ai.ts` answers questions deterministically, grounded in the profile + dataset.

All stages are deterministic; the same intake + dataset always yields the same
plan, so outputs are auditable.

## Nutrient Engine

The engine is rule-based, not statistical. Each symptom and lab result maps to
one or more nutrients via a rule table, then a daily target is assigned from the
nutrient model. Food sources are ranked by nutrient density, then adjusted for:

- diet suitability (omnivore/vegetarian/vegan, etc.),
- allergen/ingredient tags,
- a food-nutrient interaction table (antagonist / absorption effects, e.g.
  calcium inhibiting iron absorption).

The food dataset is USDA-anchored and audited; see
[FOOD_DATASET_AUDIT.md](../FOOD_DATASET_AUDIT.md) for coverage notes.

## Persistence

PostgreSQL is the single datastore. The api-server uses `pg.Pool` (connection
pooling) with a health-check on the connection. Schema and migrations are
managed in `lib/db` with Drizzle; `db:setup` provisions the database locally.
Drizzle + `drizzle-zod` keep queries and inserted rows type-safe and validated.

## Contracts & API Surface

| Concern            | Ownership        | Tooling                        |
|--------------------|------------------|--------------------------------|
| API contract       | `lib/api-spec`   | OpenAPI 3.1 (`openapi.yaml`)   |
| Server impls       | `api-server`     | Express 5 + Zod                |
| Generated client   | `lib/api-spec`   | Orval codegen                |
| Frontend consumer  | `nutrirecover`   | generated React Query client   |
| DB schema          | `lib/db`         | Drizzle ORM + `pg.Pool`        |
| Food data          | `lib/dataset`    | USDA-anchored, audited         |

Admin routes (`/api/admin/*`) are guarded by `ADMIN_SECRET_KEY` and return
`403` while the key is unset.


## Local Development

```
pnpm install                                   # install all workspaces
cp .env.example .env                           # set DATABASE_URL, PORT, ...
pnpm --filter @workspace/db db:setup            # provision PostgreSQL schema
pnpm --filter @workspace/api-server dev         # http://127.0.0.1:8099
pnpm --filter nutrirecover dev                  # http://localhost:5174
pnpm --filter nutrirecover build                # production frontend
pnpm --filter @workspace/api-server build       # bundle the api server
```

## Build & Type Checking

```
pnpm build        # build frontend + api-server (outputs to artifacts/)
pnpm typecheck    # tsc across all workspaces
pnpm test         # unit + integration tests
```

The production artifacts are emitted under `artifacts/`: the api-server bundle
is runnable with Node, and the frontend build is served by the api-server so the
two deploy as a single unit.

## Notes

- No generative AI: every value is derived from the food dataset + rules.
- The food dataset is treated as data, not model output - it is audited and
  version-pinned so results are reproducible.
- The api-server proxies `/api` in dev; in production it serves the static
  frontend build.

