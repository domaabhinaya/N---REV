import { db, foodsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { FoodRow } from "@workspace/db";

/**
 * Normalize a food name for matching.
 * Mirrors the Python norm_name behavior used in the dataset pipeline.
 */
export function normalizeFoodName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function lookupFoodByName(name: string): Promise<FoodRow | null> {
  const normalized = normalizeFoodName(name);
  if (!normalized) return null;

  // Search PRIMARY first by normalized name
  const primaryCandidates = await db
    .select()
    .from(foodsTable)
    .where(eq(foodsTable.tier, "primary"));

  const primaryMatch = primaryCandidates.find(
    (f) => normalizeFoodName(f.name) === normalized
  );
  if (primaryMatch) return primaryMatch;

  // Fallback to EXTENDED by normalized name
  const extendedCandidates = await db
    .select()
    .from(foodsTable)
    .where(eq(foodsTable.tier, "extended"));

  const extendedMatch = extendedCandidates.find(
    (f) => normalizeFoodName(f.name) === normalized
  );
  if (extendedMatch) return extendedMatch;

  return null;
}

export async function getAllFoodsForRecommendations(): Promise<FoodRow[]> {
  const all = await db.select().from(foodsTable);
  // Sort so primary foods come first, then extended
  return all.sort((a, b) => {
    if (a.tier === b.tier) return 0;
    return a.tier === "primary" ? -1 : 1;
  });
}
