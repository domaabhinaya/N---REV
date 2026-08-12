# Food Dataset Cleanup — Task List

Goal: Audit and clean the old 1,014-food dataset architecture in N-REV-main.

## Steps
- [x] 1. Audit all food-dataset files (schema, routes, engines, seed, fallback).
- [x] 2. Fix `Food` API type drift — add `tier` / `source` to `lib/api-zod/src/generated/types/food.ts`.
- [x] 3. Fix `routes/foods.ts` `tier` filter — ensure `tier` is in zod `ListFoodsParams` and access is type-safe.
- [x] 4. Write `FOOD_DATASET_AUDIT.md` documenting architecture, issues, and recommended follow-ups.
- [ ] 5. Verify TypeScript compiles (targeted) if possible.
