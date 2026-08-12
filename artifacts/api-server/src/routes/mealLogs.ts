import { Router, type IRouter } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, mealLogsTable, foodsTable } from "@workspace/db";
import type { FoodRow } from "@workspace/db";
import {
  ListMealLogsParams,
  ListMealLogsQueryParams,
  CreateMealLogParams,
  CreateMealLogBody,
  DeleteMealLogParams,
} from "@workspace/api-zod";
import { toDateString } from "../lib/date-utils";
import { convertVitaminDUgToIU } from "../lib/nutrition-calculator";
import { lookupFoodByName, normalizeFoodName } from "../lib/food-lookup";

const router: IRouter = Router();

async function serializeLog(row: typeof mealLogsTable.$inferSelect, foodName: string) {
  return {
    id: row.id,
    profileId: row.profileId,
    date: row.date,
    mealType: row.mealType,
    foodId: row.foodId,
    customFoodName: row.customFoodName,
    customLabel: row.customLabel,
    foodName,
    servings: row.servings,
  };
}

router.get("/profiles/:profileId/meal-logs", async (req, res): Promise<void> => {
  const params = ListMealLogsParams.safeParse(req.params);
  const query = ListMealLogsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: (params.error ?? query.error)?.message });
    return;
  }

  const conditions = [eq(mealLogsTable.profileId, params.data.profileId)];
  const dateFilter = toDateString(query.data.date);
  if (dateFilter) {
    conditions.push(eq(mealLogsTable.date, dateFilter));
  }

  const rows = await db
    .select()
    .from(mealLogsTable)
    .where(and(...conditions))
    .orderBy(mealLogsTable.createdAt);

  const result = rows.map(async (row) => {
    let food: FoodRow | undefined | null = row.foodId != null ? await db.select().from(foodsTable).where(eq(foodsTable.id, row.foodId)).then(r => r[0]) : undefined;
    // If no foodId but customFoodName exists, try to match by normalized name
    if (!food && row.customFoodName?.trim()) {
      food = await lookupFoodByName(row.customFoodName);
    }
    const foodName = row.customFoodName?.trim() || food?.name || "Unknown food";
    return {
      id: row.id,
      profileId: row.profileId,
      date: row.date,
      mealType: row.mealType,
      foodId: row.foodId,
      customFoodName: row.customFoodName,
      customLabel: row.customLabel,
      foodName,
      servings: row.servings,
      protein: (food?.protein ?? 0) * row.servings,
      iron: (food?.iron ?? 0) * row.servings,
      calcium: (food?.calcium ?? 0) * row.servings,
      vitaminD: convertVitaminDUgToIU((food?.vitaminD ?? 0) * row.servings),
    };
  });

  res.json(await Promise.all(result));
});

router.post("/profiles/:profileId/meal-logs", async (req, res): Promise<void> => {
  const params = CreateMealLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateMealLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { foodId, customFoodName, customLabel, servings, mealType, date } = parsed.data;

  // Must provide either a dataset foodId or a manual custom food name.
  if (foodId == null && !customFoodName?.trim()) {
    res.status(400).json({ error: "Provide either foodId (dataset) or customFoodName (manual)." });
    return;
  }

  let resolvedFoodId: number | null = foodId ?? null;
  let foodName = customFoodName?.trim() || "";

  // If no foodId provided but customFoodName exists, try to match by normalized name
  if (foodId == null && customFoodName?.trim()) {
    const matched = await lookupFoodByName(customFoodName);
    if (matched) {
      resolvedFoodId = matched.id;
      foodName = matched.name;
    }
  }

  // If we have a foodId, verify it exists
  if (resolvedFoodId != null) {
    const [food] = await db.select().from(foodsTable).where(eq(foodsTable.id, resolvedFoodId));
    if (!food) {
      res.status(400).json({ error: "Food not found" });
      return;
    }
    foodName = food.name;
  }

  const [row] = await db
    .insert(mealLogsTable)
    .values({
      profileId: params.data.profileId,
      date: toDateString(date) as string,
      mealType,
      foodId: resolvedFoodId,
      customFoodName: resolvedFoodId != null ? null : customFoodName?.trim() || null,
      customLabel: customLabel?.trim() || null,
      servings,
    })
    .returning();

  const food = resolvedFoodId != null ? await db.select().from(foodsTable).where(eq(foodsTable.id, resolvedFoodId)).then(r => r[0]) : undefined;

  res.status(201).json({
    id: row.id,
    profileId: row.profileId,
    date: row.date,
    mealType: row.mealType,
    foodId: row.foodId,
    customFoodName: row.customFoodName,
    customLabel: row.customLabel,
    foodName,
    servings: row.servings,
    protein: (food?.protein ?? 0) * row.servings,
    iron: (food?.iron ?? 0) * row.servings,
    calcium: (food?.calcium ?? 0) * row.servings,
    vitaminD: convertVitaminDUgToIU((food?.vitaminD ?? 0) * row.servings),
  });
});

router.delete("/meal-logs/:mealLogId", async (req, res): Promise<void> => {
  const params = DeleteMealLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(mealLogsTable).where(eq(mealLogsTable.id, params.data.mealLogId)).returning();
  if (!row) {
    res.status(404).json({ error: "Meal log not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;