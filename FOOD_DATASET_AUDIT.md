# Food Dataset Architecture — Audit & Cleanup Report

Date: Audit of the old ~1,014-food dataset architecture in `N-REV-main`.

## 1. Scope
This document audits the legacy food-dataset pipeline that seeds and serves the
nutrition dataset (the foundational ~1,014 foods referenced across the app).
It covers the schema, seed pipeline, lookup, recommendation engines, meal-plan
generators, API routes, and the API type layer.

## 2. Architecture Overview

### 2.1 Dataset files (source of truth)
Located at the repo root:
- `NREV_Refined_Dataset.xlsx` — primary tier foods
- `NREV_Extended_Dataset.xlsx` — extended tier foods
- `NREV_Subset_Common.xlsx` — subset used elsewhere
- `dataset.xlsx` — legacy/raw dataset

> The "1,014" count is **not a hard-coded magic number**. It is the runtime sum of
> primary + extended rows after name-normalization dedup performed in `seed.ts`.

### 2.2 DB schema
`lib/db/src/schema/foods.ts` defines `foodsTable`:
- Core nutrients: `protein`, `iron`, `calcium`, `vitaminD` (NOT NULL)
- Optional nutrients: `magnesium`, `vitaminA`, `vitaminC`, `vitaminB7`, `vitaminE`, `vitaminK`
- Tag arrays: `dietTags`, `mealTags`, `cuisineTags`
- `tier` (`primary` | `extended`) default `primary`
- `source` (nullable provenance)

`lib/db/src/schema/mealLogs.ts` adds `meal_logs` with nullable `foodId` plus
`customFoodName` / `customLabel`, enabling manual custom foods.

### 2.3 Seed pipeline
`artifacts/api-server/src/lib/seed.ts`:
- Reads both XLSX files via `xlsx`.
- `mapRowToFood` maps flexible column aliases (e.g. `protein_g`/`Protein_g`/`protein`).
- Dedups extended foods against primary by `normalizeFoodName`.
- Inserts in batches of 1000.
- Falls back to `food-data.ts` (`SEED_FOODS`, ~60 curated foods) on failure.

### 2.4 Lookup & ranking
`artifacts/api-server/src/lib/food-lookup.ts`:
- `normalizeFoodName` mirrors the Python `norm_name` used in the dataset pipeline.
- `lookupFoodByName` searches primary first, then extended.
- `getAllFoodsForRecommendations` returns all foods, primary-first.

### 2.5 Recommendation & meal-plan engines
- `food-recommendation-engine.ts` — `recommendFoods` / `getTopFoodRecommendations`
- `meal-plan-generator.ts` — `generateMealPlan` / `regenerateMeal`
- `meal-planner.ts` — `generateRecoveryPlan` (30-day rotating plan)
- `nutrition-calculator.ts` — `sumNutrients`, `buildNutrientLines`, VitD µg→IU
- `recovery-engine.ts` — symptom/lab → nutrient priority scoring
- `suggestion-engine.ts` — nutrient-gap suggestions

### 2.6 API routes
- `routes/foods.ts` — GET `/foods` (dietType/tier filter)
- `routes/mealLogs.ts` — meal-log CRUD + name lookup
- `routes/dashboard.ts` — daily summary, suggestions, dashboard
- `routes/recovery.ts` — recovery plan + targets
- `routes/admin.ts` — admin CRUD + dataset upload/export

## 3. Issues Found & Fixes Applied

### 3.1 `Food` API type drift (FIXED)
- **Issue:** `lib/api-zod/src/generated/types/food.ts` omitted `tier` and `source`
  that exist in the DB schema, so the API type did not reflect the actual rows.
- **Fix:** Added `tier: string` and `source?: string | null`.

### 3.2 `tier` filter not wired in the foods route (FIXED)
- **Issue:** `routes/foods.ts` reads `query.data.tier`, but the zod schema
  `ListFoodsQueryParams` only defined `dietType`. After `.safeParse`, `tier` was
  always stripped → the filter was dead code, and the property access was unsafe.
- **Fix:** Added `tier?: 'primary' | 'extended'` to `ListFoodsQueryParams` (zod)
  and to the `ListFoodsParams` type so the route filter is type-safe and functional.

## 4. Recommended Follow-ups (NOT applied — higher risk)

### 4.1 Dead / legacy code
- `artifacts/api-server/src/lib/recovery-plan-generator.ts` (~600 lines of
  hardcoded food/lifestyle advice) is **not imported** by any live route.
  `recovery.ts` uses `generateRecoveryPlan` from `meal-planner.ts` instead.
  → Candidate for removal after confirming no external references.

### 4.2 Repeated full-table loads
13 sites call `db.select().from(foodsTable)` with no limit/offset
(`food-lookup.ts`, `dashboard.ts` ×5, `foods.ts`, `mealLogs.ts` ×3, `admin.ts` ×2).
For a ~1k-row dataset this is acceptable, but a shared cached/helper function
would centralize access and simplify future pagination.

### 4.3 Duplicated constants / logic
- `DAILY_VALUES` is duplicated in `food-recommendation-engine.ts` and
  `meal-plan-generator.ts`.
- `getNutrientAmount` / `getNutrientAmountFromFoodRow` duplicate the same
  switch over nutrient fields.
→ Extract to a single shared module (e.g. `nutrients.ts`).

### 4.4 Two-tier duplication risk
`mapRowToFood` defaults `dietTags`/`mealTags`/`cuisineTags` to empty, and the
Excel columns for these tags are not mapped. Recommendation/diet filtering then
relies on the curated `ALLERGEN_FOOD_MAP` / name matching rather than dataset tags.
→ Consider populating tags during seed or at admin-upload time.

## 5. Files Touched During Cleanup
- `lib/api-zod/src/generated/types/food.ts` — added `tier` / `source`
- `lib/api-zod/src/generated/types/listFoodsParams.ts` — added `tier`
- `lib/api-zod/src/generated/api.ts` — added `tier` to `ListFoodsQueryParams`

## 6. Verification Notes
- The `api.ts` file is auto-generated by orval; some pre-existing formatting/parse
  errors exist in the generated file tree and are not introduced by these edits.
- No runtime behavior for existing meal-logging, daily-summary, or dashboard
  endpoints was changed; the `tier` addition is additive and optional.
