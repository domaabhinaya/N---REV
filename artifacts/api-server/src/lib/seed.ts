import { db, foodsTable } from "@workspace/db";
import { logger } from "./logger";
import * as XLSX from "xlsx";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { normalizeFoodName } from "./food-lookup";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const PRIMARY_XLSX = join(projectRoot, "NREV_Refined_Dataset.xlsx");
const EXTENDED_XLSX = join(projectRoot, "NREV_Extended_Dataset.xlsx");
const BATCH_SIZE = 1000;

function loadDatasetFromExcel(path: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(path);
  const sheetName =
    workbook.SheetNames.find((name) =>
      name.toLowerCase().includes("cleaned") || name.toLowerCase().includes("final")
    ) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
}

function mapRowToFood(
  row: Record<string, unknown>,
  tier: "primary" | "extended"
): {
  name: string;
  servingSize: string;
  protein: number;
  iron: number;
  calcium: number;
  vitaminD: number;
  magnesium: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  vitaminB7: number | null;
  vitaminE: number | null;
  vitaminK: number | null;
  vitaminB12: number | null;
  vitaminB1: number | null;
  vitaminB2: number | null;
  vitaminB3: number | null;
  vitaminB6: number | null;
  dietTags: string[];
  mealTags: string[];
  cuisineTags: string[];
  tier: "primary" | "extended";
  source: string | null;
} {
  const name = String(
    row["food_name"] || row["Food Name"] || row["name"] || row["Food"] || ""
  );
  const servingSize = String(
    row["serving_size"] ||
      row["Serving Size"] ||
      row["serving_description"] ||
      "1 serving"
  );
  const source =
    (row["source"] as string | undefined) ??
    (row["Source"] as string | undefined) ??
    null;

  return {
    name,
    servingSize,
    protein: Number(row["protein_g"] || row["Protein_g"] || row["protein"] || 0),
    iron: Number(row["iron_mg"] || row["Iron_mg"] || row["iron"] || 0),
    calcium: Number(row["calcium_mg"] || row["Calcium_mg"] || row["calcium"] || 0),
    vitaminD: Number(
      row["vitamin_d_ug"] || row["VitaminD_IU"] || row["vitamin_d"] || 0
    ),
    magnesium: row["magnesium_mg"] != null ? Number(row["magnesium_mg"]) : null,
    vitaminA: row["vitamin_a_ug"] != null ? Number(row["vitamin_a_ug"]) : null,
    vitaminC: row["vitamin_c_mg"] != null ? Number(row["vitamin_c_mg"]) : null,
    vitaminB7: row["vitamin_b7_ug"] != null ? Number(row["vitamin_b7_ug"]) : null,
    vitaminE: row["vitamin_e_mg"] != null ? Number(row["vitamin_e_mg"]) : null,
    vitaminK: row["vitamin_k_ug"] != null ? Number(row["vitamin_k_ug"]) : null,
    vitaminB12: row["vitamin_b12_ug"] != null ? Number(row["vitamin_b12_ug"]) : null,
    vitaminB1: row["vitamin_b1_mg"] != null ? Number(row["vitamin_b1_mg"]) : null,
    vitaminB2: row["vitamin_b2_mg"] != null ? Number(row["vitamin_b2_mg"]) : null,
    vitaminB3: row["vitamin_b3_mg"] != null ? Number(row["vitamin_b3_mg"]) : null,
    vitaminB6: row["vitamin_b6_mg"] != null ? Number(row["vitamin_b6_mg"]) : null,
    dietTags: [],
    mealTags: [],
    cuisineTags: [],
    tier,
    source,
  };
}

async function batchInsert(
  foods: {
    name: string;
    servingSize: string;
    protein: number;
    iron: number;
    calcium: number;
    vitaminD: number;
    magnesium: number | null;
    vitaminA: number | null;
    vitaminC: number | null;
    vitaminB7: number | null;
    vitaminE: number | null;
    vitaminK: number | null;
    vitaminB12: number | null;
    vitaminB1: number | null;
    vitaminB2: number | null;
    vitaminB3: number | null;
    vitaminB6: number | null;
    dietTags: string[];
    mealTags: string[];
    cuisineTags: string[];
    tier: "primary" | "extended";
    source: string | null;
  }[]
): Promise<void> {
  for (let i = 0; i < foods.length; i += BATCH_SIZE) {
    const batch = foods.slice(i, i + BATCH_SIZE);
    await db.insert(foodsTable).values(batch);
  }
}

export async function seedFoodsIfEmpty(): Promise<void> {
  const existing = await db.select({ id: foodsTable.id }).from(foodsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  try {
    logger.info({ path: PRIMARY_XLSX }, "Loading primary dataset");
    const primaryRaw = loadDatasetFromExcel(PRIMARY_XLSX);
    const primaryFoods = primaryRaw
      .map((row) => mapRowToFood(row, "primary"))
      .filter((food) => food.name && food.servingSize);

    logger.info({ count: primaryFoods.length }, "Primary dataset loaded");

    logger.info({ path: EXTENDED_XLSX }, "Loading extended dataset");
    const extendedRaw = loadDatasetFromExcel(EXTENDED_XLSX);
    const extendedFiltered = extendedRaw
      .map((row) => mapRowToFood(row, "extended"))
      .filter((food) => food.name && food.servingSize);

    const primaryNames = new Set(
      primaryFoods.map((f) => normalizeFoodName(f.name)).filter(Boolean)
    );
    const extendedFoods = extendedFiltered.filter(
      (food) => !primaryNames.has(normalizeFoodName(food.name))
    );

    logger.info(
      {
        count: extendedFoods.length,
        skipped: extendedFiltered.length - extendedFoods.length,
      },
      "Extended dataset deduplicated"
    );

    const allFoods = [...primaryFoods, ...extendedFoods];

    if (allFoods.length === 0) {
      throw new Error("No valid food records found in datasets");
    }

    await batchInsert(allFoods);
    logger.info(
      {
        primary: primaryFoods.length,
        extended: extendedFoods.length,
        total: allFoods.length,
      },
      "Seeded foods table from two-tier datasets"
    );
  } catch (error) {
    logger.error({ err: error }, "Failed to seed from datasets, using fallback");
    const { SEED_FOODS } = await import("./food-data");
    const foodsToInsert = SEED_FOODS.map((food) => ({
      name: food.name,
      servingSize: food.servingSize,
      protein: food.protein,
      iron: food.iron,
      calcium: food.calcium,
      vitaminD: food.vitaminD,
      magnesium: food.magnesium ?? null,
      vitaminA: food.vitaminA ?? null,
      vitaminC: food.vitaminC ?? null,
      vitaminB7: food.vitaminB7 ?? null,
      vitaminE: food.vitaminE ?? null,
      vitaminK: food.vitaminK ?? null,
      vitaminB12: food.vitaminB12 ?? null,
      vitaminB1: food.vitaminB1 ?? null,
      vitaminB2: food.vitaminB2 ?? null,
      vitaminB3: food.vitaminB3 ?? null,
      vitaminB6: food.vitaminB6 ?? null,
      dietTags: food.dietTags,
      mealTags: food.mealTags,
      cuisineTags: food.cuisineTags,
      tier: "primary" as const,
      source: null,
    }));
    await batchInsert(foodsToInsert);
    logger.info(
      { count: SEED_FOODS.length },
      "Seeded foods table from fallback data"
    );
  }
}
