# N-REV

A full-stack nutrition recovery and deficiency-support platform that integrates structured nutritional assessment, nutrient-priority analysis, a 15-nutrient food dataset, personalized recovery planning, meal tracking, and an AI assistant into a unified workflow.

> **Status:** Active development and testing. Not a substitute for professional medical or nutritional advice.

## Overview

N-REV guides a user through a structured recovery workflow: capture an assessment (including optional lab values), derive 15-nutrient status and priority, match against a food dataset, generate a multi-day recovery/meal plan, and enable day-to-day meal tracking with an AI assistant grounded in the user's actual data.

## Core Workflow

- **Assessment** â€” profile, diet type, allergies, cuisine preference, optional lab values, lifestyle, and BMI
- **Nutrient analysis** â€” 15-nutrient model computes current status and deficiency priority
- **Priority identification** â€” nutrients ranked by deficiency severity and target gap
- **Food / dataset integration** â€” nutrient-dataset matching, cuisine + diet-type filtering, allergy-safe ranking
- **Recovery planning** â€” generated multi-day meal plan with daily nutrient targets
- **Meal tracking** â€” Day 1 open by default; additional days selectable
- **AI assistant** â€” answer questions using the user's actual profile, plans, labs, and food data (no external AI APIs)

## Key Capabilities

- 15-nutrient deficiency analysis with daily targets
- Optional lab integration (hemoglobin, ferritin, B12, vitamin D, calcium, total protein, plus extended labs where provided)
- Cuisine-aware food ranking (Indian, South Indian, North Indian, Asian, Western, Global) with graceful fallback
- Diet-type + allergy-safe food filtering
- Multi-day recovery plan with per-meal food suggestions
- Dataset-grounded AI assistant answering recovery, nutrition, food, interaction, and BMI questions
- Meal tracking with progress toward daily targets

## Technology Stack

Frontend
- React, TypeScript
- Vite (dev server)

Backend
- Node.js (TypeScript), Express

Database
- PostgreSQL (Neon), Drizzle ORM (schema in `lib/db`)

Data
- 15-nutrient model (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))
- Curated food dataset used for recovery recommendations and AI grounding

Other
- pnpm workspaces (monorepo)
- Orval (generates API client + Zod types from OpenAPI)

## Architecture

Repository layout:

```
N-REV/
â”œâ”€â”€ artifacts/            # Buildable applications
â”‚   â”œâ”€â”€ api-server/       # Backend Express API server
â”‚   â”œâ”€â”€ nutrirecover/     # Frontend web app
â”‚   â””â”€â”€ mockup-sandbox/   # UI mockup sandbox (separate, dev only)
â”œâ”€â”€ lib/                  # Shared libraries
â”‚   â”œâ”€â”€ db/               # Drizzle ORM schema + dataset + seed/migrate scripts
â”‚   â”œâ”€â”€ api-spec/         # Orval config + OpenAPI spec
â”‚   â”œâ”€â”€ api-zod/          # Generated Zod types
â”‚   â”œâ”€â”€ api-client-react/ # Generated React query client
â”‚   â””â”€â”€ api-client/       # Generated base client
â”œâ”€â”€ scripts/              # Utility scripts
â”œâ”€â”€ docs/                 # Documentation
â”œâ”€â”€ .env.example          # Environment variable template
â”œâ”€â”€ .gitignore
â”œâ”€â”€ package.json          # Root workspace package
â”œâ”€â”€ pnpm-workspace.yaml
â””â”€â”€ README.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data flow, engine details, and the dataset pipeline.

## Data Flow

1. Frontend submits Assessment â†’ `POST /profiles`
2. Backend stores profile; `GET /profiles/:id/targets` runs the nutrient calculator / priorities
3. `GET /profiles/:id/recovery-plan` loads the food dataset and runs the meal planner
4. API returns structured response (priorities, plan, explanations, interaction data)
5. Frontend renders Recovery Plan, meal plan, and Lab Results
6. `POST /api/assistant/chat` serves AI answers grounded in the user's actual profile, plan, labs, and food data

## Nutrient Model

N-REV uses a **15-nutrient model**. Core tracked nutrients (also the primary deficiency-analysis targets):

- Iron (Fe)
- Protein
- Vitamin B12 (Cobalamin)
- Vitamin D (Calciferol)
- Calcium (Ca)
- Magnesium (Mg)
- Vitamin A (Retinol activity equivalents)
- Vitamin C (Ascorbic acid)
- Biotin (Vitamin B7)
- Vitamin E (Tocopherol)
- Vitamin K (Phylloquinone)
- Thiamin (Vitamin B1)
- Riboflavin (Vitamin B2)
- Niacin (Vitamin B3)
- Pyridoxine (Vitamin B6)

Reference ranges and deficiency thresholds are implemented in the backend engines; see `docs/ARCHITECTURE.md` for the source-of-truth files.

## Environment Variables

All environment-specific and secret configuration belongs in `.env`. Copy the example:

```bash
cp .env.example .env
# then edit .env with your real values
```

| Variable | Where used | Purpose |
|---|---|---|
| `DATABASE_URL` | api-server | PostgreSQL connection (required) |
| `PORT` | api-server | Backend listen port |
| `NODE_ENV` | api-server | `development` \| `production` |
| `JWT_SECRET` | api-server | Session/JWT signing |
| `GROQ_API_KEY` | api-server | Optional (AI assistant backend) |
| `OPENAI_API_KEY` | api-server | Optional (AI assistant backend) |
| `PORT` | nutrirecover (Vite) | Frontend dev port (default `5174`) |

> Secrets must never be committed. `.env` is git-ignored; only `.env.example` is tracked.

## Local Development

From the repository root:

```bash
# 1. Install dependencies (workspace)
pnpm install

# 2. API server â€” requires DATABASE_URL
cd artifacts/api-server
pnpm dev          # Express API on PORT (default 8099)

# 3. Frontend (in a separate terminal)
cd artifacts/nutrirecover
pnpm dev          # Vite dev server on PORT (default 5174)

# 4. Seed/reset the database (optional)
cd lib/db
pnpm seed          # idempotent; preserves user data where possible
```

Useful one-liners run from the repo root:

```bash
pnpm -C artifacts/api-server typecheck
pnpm -C artifacts/api-server build
pnpm -C artifacts/nutrirecover typecheck
pnpm -C artifacts/nutrirecover build
```

## Build & Type Checking

| Action | Command |
|---|---|
| Backend typecheck | `pnpm -C artifacts/api-server typecheck` |
| Backend build | `pnpm -C artifacts/api-server build` |
| Frontend typecheck | `pnpm -C artifacts/nutrirecover typecheck` |
| Frontend build | `pnpm -C artifacts/nutrirecover build` |
| API client/spec regenerate | `pnpm --filter @workspace/api-spec run generate` |
| DB migrate + seed | `pnpm -C lib/db migrate && pnpm -C lib/db seed` |

## Project Status

N-REV is an active development/testing project. The API, UI, dataset, and AI assistant are under continuous refinement.

## Disclaimer

N-REV is a software and research/educational project. It does **not** diagnose disease, prescribe treatment, or replace professional medical or nutritional advice. Lab-reference thresholds and nutrient recommendations are provided for informational purposes only. Always consult a qualified healthcare or nutrition professional before making significant dietary or lifestyle changes, especially if you have a medical condition, are pregnant or nursing, or are taking medication.
