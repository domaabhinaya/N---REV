import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, profilesTable, foodsTable, mealLogsTable } from "@workspace/db";
import { GetDailySummaryParams, GetDailySummaryQueryParams, GetSuggestionsParams, GetSuggestionsQueryParams, GetDashboardParams } from "@workspace/api-zod";
import { getPrioritiesWithFoodSources, targetsMap } from "../lib/profile-service";
import { sumNutrients, buildNutrientLines, type FoodNutrients, convertVitaminDUgToIU } from "../lib/nutrition-calculator";
import { generateSuggestions } from "../lib/suggestion-engine";
import type { FoodRow } from "@workspace/db";
import type { PlannerFood } from "../lib/meal-planner";
import { toDateString, todayStr } from "../lib/date-utils";
import { lookupFoodByName, normalizeFoodName } from "../lib/food-lookup";

const router: IRouter = Router();

async function loadDayLogs(profileId: number, date: string) {
  const logs = await db
    .select()
    .from(mealLogsTable)
    .where(and(eq(mealLogsTable.profileId, profileId), eq(mealLogsTable.date, date)));

  const items = logs.map(async (log) => {
    let food: FoodRow | undefined | null = log.foodId != null ? await db.select().from(foodsTable).where(eq(foodsTable.id, log.foodId)).then(r => r[0]) : undefined;
    // If no foodId but customFoodName exists, try to match by normalized name
    if (!food && log.customFoodName?.trim()) {
      food = await lookupFoodByName(log.customFoodName);
    }
    return { log, food };
  });

  const foods = await db.select().from(foodsTable);
  return { items: await Promise.all(items), foods };
}

router.get("/profiles/:profileId/daily-summary", async (req, res): Promise<void> => {
  const params = GetDailySummaryParams.safeParse(req.params);
  const query = GetDailySummaryQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: (params.error ?? query.error)?.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.profileId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const date = toDateString(query.data.date) ?? todayStr();
  const { items } = await loadDayLogs(profile.id, date);

  const foodsForCalc = await db.select().from(foodsTable);
  const priorities = getPrioritiesWithFoodSources(profile, foodsForCalc);
  // Use default targets if no priorities or all are "low"
  const targets = (priorities.length > 0 && priorities.some((p) => p.priority !== "low"))
    ? targetsMap(priorities)
    : { protein: 50, iron: 18, calcium: 1000, vitamin_d: 600, magnesium: 400, vitamin_a: 900, vitamin_c: 90, vitamin_b7: 30, vitamin_e: 15, vitamin_k: 120, vitamin_b1: 1.2, vitamin_b2: 1.3, vitamin_b3: 16, vitamin_b6: 1.3, vitamin_b12: 2.4 };

  const consumed: FoodNutrients = sumNutrients(
    items
      .filter((i) => i.food)
      .map((i) => ({ food: i.food as PlannerFood, servings: i.log.servings })),
  );
  const nutrientLines = buildNutrientLines(consumed, targets);

  const mealLogs = items.map(({ log, food }) => ({
    id: log.id,
    profileId: log.profileId,
    date: log.date,
    mealType: log.mealType,
    foodId: log.foodId,
    customFoodName: log.customFoodName,
    customLabel: log.customLabel,
    foodName: log.customFoodName?.trim() || food?.name || "Unknown food",
    servings: log.servings,
    protein: (food?.protein ?? 0) * log.servings,
    iron: (food?.iron ?? 0) * log.servings,
    calcium: (food?.calcium ?? 0) * log.servings,
    vitaminD: convertVitaminDUgToIU((food?.vitaminD ?? 0) * log.servings),
  }));

  res.json({ date, nutrients: nutrientLines, mealLogs });
});

router.get("/profiles/:profileId/suggestions", async (req, res): Promise<void> => {
  const params = GetSuggestionsParams.safeParse(req.params);
  const query = GetSuggestionsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: (params.error ?? query.error)?.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.profileId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const date = toDateString(query.data.date) ?? todayStr();
  const { items, foods } = await loadDayLogs(profile.id, date);

  // Get priorities - if none exist (user hasn't completed assessment), use default targets
  const priorities = getPrioritiesWithFoodSources(profile, foods);
  const targets = priorities.length > 0 && priorities.some((p) => p.priority !== "low")
    ? targetsMap(priorities)
    : { protein: 50, iron: 18, calcium: 1000, vitamin_d: 600, magnesium: 400, vitamin_a: 900, vitamin_c: 90, vitamin_b7: 30, vitamin_e: 15, vitamin_k: 120, vitamin_b1: 1.2, vitamin_b2: 1.3, vitamin_b3: 16, vitamin_b6: 1.3, vitamin_b12: 2.4 };

  const consumed = sumNutrients(
    items.filter((i) => i.food).map((i) => ({ food: i.food as PlannerFood, servings: i.log.servings })),
  );
  const nutrientLines = buildNutrientLines(consumed, targets);

const loggedFoodNames = new Set(items.map((i) => i.food?.name).filter((n): n is string => Boolean(n)));

  const suggestions = generateSuggestions(nutrientLines, foods, profile.dietType, loggedFoodNames, {
    symptoms: profile.symptoms,
    hemoglobin: profile.hemoglobin,
    ferritin: profile.ferritin,
    vitaminDLevel: profile.vitaminDLevel,
    vitaminB12Level: profile.vitaminB12Level,
    serumCalcium: profile.serumCalcium,
    totalProtein: profile.totalProtein,
  }, profile.cuisinePreference);
  res.json(suggestions);
});

router.get("/profiles/:profileId/dashboard", async (req, res): Promise<void> => {
  const params = GetDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.profileId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const foods = await db.select().from(foodsTable);
  const priorities = getPrioritiesWithFoodSources(profile, foods);
  const targets = targetsMap(priorities);
  const activeNutrients = priorities.filter((p) => p.priority !== "low");

  const allLogs = await db.select().from(mealLogsTable).where(eq(mealLogsTable.profileId, profile.id));

  const dateSet = new Set(allLogs.map((l) => l.date));
  const daysTracked = dateSet.size;

  const last7Dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Dates.push(d.toISOString().slice(0, 10));
  }

  const weeklyHistory = last7Dates.map(async (date) => {
    const dayLogs = allLogs.filter((l) => l.date === date);
    const mapped = dayLogs.map(async (l) => {
      let food: FoodRow | undefined | null = l.foodId != null ? await db.select().from(foodsTable).where(eq(foodsTable.id, l.foodId)).then(r => r[0]) : undefined;
      if (!food && l.customFoodName?.trim()) {
        food = await lookupFoodByName(l.customFoodName);
      }
      return { food, servings: l.servings };
    });
    const mappedFoods = await Promise.all(mapped);
    const totals = sumNutrients(
      mappedFoods
        .filter((x): x is { food: PlannerFood; servings: number } => Boolean(x.food))
        .map((x) => ({ food: x.food as PlannerFood, servings: x.servings }))
    );
    return {
      date,
      protein: Math.round(totals.protein * 10) / 10,
      iron: Math.round(totals.iron * 10) / 10,
      calcium: Math.round(totals.calcium * 10) / 10,
      vitaminD: Math.round(totals.vitaminD * 10) / 10,
      magnesium: Math.round(totals.magnesium * 10) / 10,
      vitaminA: Math.round(totals.vitaminA * 10) / 10,
      vitaminC: Math.round(totals.vitaminC * 10) / 10,
      vitaminB7: Math.round(totals.vitaminB7 * 10) / 10,
      vitaminE: Math.round(totals.vitaminE * 10) / 10,
      vitaminK: Math.round(totals.vitaminK * 10) / 10,
      vitaminB12: Math.round(totals.vitaminB12 * 10) / 10,
      vitaminB1: Math.round(totals.vitaminB1 * 10) / 10,
      vitaminB2: Math.round(totals.vitaminB2 * 10) / 10,
      vitaminB3: Math.round(totals.vitaminB3 * 10) / 10,
      vitaminB6: Math.round(totals.vitaminB6 * 10) / 10,
    };
  });

  const weeklyHistoryResolved = await Promise.all(weeklyHistory);

  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (dateSet.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  const daysWithLogs = last7Dates.filter((d) => dateSet.has(d));
  const foodMap = new Map(foods.map((f) => [f.id, f] as const));
  const foodNameToId = new Map<string, number>();
  for (const f of foods) {
    foodNameToId.set(normalizeFoodName(f.name), f.id);
  }
  let adherenceSum = 0;
  for (const date of daysWithLogs) {
    const dayLogs = allLogs.filter((l) => l.date === date);
    const totals = sumNutrients(
      dayLogs
        .map((l) => {
          let food = l.foodId != null ? foodMap.get(l.foodId) : undefined;
          // If no foodId but customFoodName exists, try to match by name
          if (!food && l.customFoodName?.trim()) {
            const matchedId = foodNameToId.get(l.customFoodName.toLowerCase().trim());
            if (matchedId) {
              food = foodMap.get(matchedId);
            }
          }
          return { food, servings: l.servings };
        })
        .filter((x): x is { food: PlannerFood; servings: number } => Boolean(x.food)),
    );
    const lines = buildNutrientLines(totals, targets);
    const onTargetCount = lines.filter((l) => l.status === "on_target").length;
    adherenceSum += (onTargetCount / lines.length) * 100;
  }
  const weeklyAdherenceScore = daysWithLogs.length > 0 ? Math.round(adherenceSum / daysWithLogs.length) : 0;

  // Calculate recovery score (out of 100)
  // Based on: 50% nutrient adherence, 30% logging consistency, 20% streak
  const nutrientAdherenceScore = activeNutrients.length > 0
    ? Math.round(activeNutrients.reduce((sum, n) => {
        const recentAvg = weeklyHistoryResolved.reduce((s, day) => {
          const key = n.nutrient === "vitamin_d" ? "vitaminD" : n.nutrient;
          return s + ((day as unknown as Record<string, number>)[key] ?? 0);
        }, 0) / 7;
        return sum + Math.min(100, Math.round((recentAvg / n.dailyTarget) * 100));
      }, 0) / activeNutrients.length)
    : 0;

  const loggingConsistencyScore = daysTracked > 0
    ? Math.min(100, Math.round((daysTracked / 30) * 100)) // 30 days = full score
    : 0;

  const streakScore = Math.min(100, Math.round((streak / 14) * 100)); // 14 days = full score

  const recoveryScore = Math.round(
    (nutrientAdherenceScore * 0.5) +
    (loggingConsistencyScore * 0.3) +
    (streakScore * 0.2)
  );

  const insights: string[] = [];
  if (daysTracked === 0) {
    insights.push("Start logging your meals to see personalized recovery-support insights here.");
  } else {
    if (streak >= 3) {
      insights.push(`You're on a ${streak}-day tracking streak — consistency is a big part of nutrition recovery support.`);
    }
    for (const nutrient of activeNutrients) {
      const recentAvg =
        weeklyHistoryResolved.reduce((sum, day) => {
          const key = nutrient.nutrient === "vitamin_d" ? "vitaminD" : nutrient.nutrient;
          return sum + ((day as unknown as Record<string, number>)[key] ?? 0);
        }, 0) / 7;
      const pct = Math.round((recentAvg / nutrient.dailyTarget) * 100);
      if (pct >= 90) {
        insights.push(`Your ${nutrient.nutrient.replace("_", " ")} intake has been meeting its recovery target this week — great work.`);
      } else if (recentAvg > 0) {
        insights.push(`Your ${nutrient.nutrient.replace("_", " ")} intake is averaging around ${pct}% of its recovery target this week — consider adding more sources from your plan.`);
      }
    }
    if (insights.length === 1) {
      insights.push("Log a few more meals to unlock richer nutrient trend insights.");
    }
  }

  res.json({
    activeNutrients,
    daysTracked,
    streak,
    weeklyAdherenceScore,
    weeklyHistory: weeklyHistoryResolved,
    insights,
    recoveryScore,
  });
});

export default router;
