import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { GetProfileParams, UpdateProfileBody } from "@workspace/api-zod";
import { getPrioritiesWithFoodSources } from "../lib/profile-service";
import { resolveCuisine, DEFAULT_CUISINE } from "../lib/cuisine";
import type { PlannerFood } from "../lib/meal-planner";
import { getAllFoodsForRecommendations } from "../lib/food-lookup";

const router: IRouter = Router();

async function loadFoods(): Promise<PlannerFood[]> {
  return await getAllFoodsForRecommendations();
}

router.get("/profiles", async (_req, res): Promise<void> => {
  const rows = await db.select().from(profilesTable).orderBy(profilesTable.createdAt);
  const foods = await loadFoods();
  const result = rows.map((row) => ({
    ...row,
    priorities: getPrioritiesWithFoodSources(row, foods),
  }));
  res.json(result);
});

router.post("/profiles", async (req, res): Promise<void> => {
  try {
    // Validate required fields manually below (the profile body may contain
    // sensitive lab/health values, so the raw body is never logged).
    // ===== STEP 2: Validate required fields manually =====
    // NOTE: CreateProfileBody Zod schema restricts symptoms to only 14 enum values,
    // but the frontend sends 40+ symptom values (weight_loss, constipation, fever, etc.).
    // The DB stores symptoms as text[] with no enum constraint, so we validate manually.
    const body = req.body || {};

    // Required fields — return 400 if missing
    const requiredFields = ["name", "age", "gender", "heightCm", "weightKg", "dietType"];
    const missingFields = requiredFields.filter(
      (f) => body[f] === undefined || body[f] === null || body[f] === "",
    );
    if (missingFields.length > 0) {
      console.error("[Backend] Missing required fields:", missingFields);
      res.status(400).json({
        success: false,
        message: "Profile creation failed",
        reason: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    // Validate dietType against allowed values
    const allowedDietTypes = ["vegetarian", "eggetarian", "non_vegetarian", "vegan"];
    if (!allowedDietTypes.includes(body.dietType)) {
      res.status(400).json({
        success: false,
        message: "Profile creation failed",
        reason: `dietType must be one of: ${allowedDietTypes.join(", ")}`,
      });
      return;
    }

    // Validate numeric types
    if (typeof body.age !== "number" || body.age < 1) {
      res.status(400).json({ success: false, message: "Profile creation failed", reason: "age must be a number >= 1" });
      return;
    }
    if (typeof body.heightCm !== "number" || body.heightCm <= 0) {
      res.status(400).json({ success: false, message: "Profile creation failed", reason: "heightCm must be a positive number" });
      return;
    }
    if (typeof body.weightKg !== "number" || body.weightKg <= 0) {
      res.status(400).json({ success: false, message: "Profile creation failed", reason: "weightKg must be a positive number" });
      return;
    }

    // ===== STEP 3: Build the insert payload with safe defaults =====
    // Map to Drizzle columns: Drizzle ORM maps camelCase keys to snake_case column names
    const insertData = {
      name: String(body.name),
      age: Number(body.age),
      gender: String(body.gender),
      heightCm: Number(body.heightCm),
      weightKg: Number(body.weightKg),
      dietType: String(body.dietType),
      // symptoms: notNull with default [] — accept any string array from frontend
      symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
      // Optional fields — provide null (DB default) if not provided
      allergies: body.allergies != null ? String(body.allergies) : null,
      cuisinePreference: body.cuisinePreference != null ? resolveCuisine(body.cuisinePreference) : DEFAULT_CUISINE,
      budget: body.budget != null ? String(body.budget) : null,
      hemoglobin: body.hemoglobin != null ? Number(body.hemoglobin) : null,
      ferritin: body.ferritin != null ? Number(body.ferritin) : null,
      vitaminB12Level: body.vitaminB12Level != null ? Number(body.vitaminB12Level) : null,
      vitaminDLevel: body.vitaminDLevel != null ? Number(body.vitaminDLevel) : null,
      serumCalcium: body.serumCalcium != null ? Number(body.serumCalcium) : null,
      totalProtein: body.totalProtein != null ? Number(body.totalProtein) : null,
      rbcCount: body.rbcCount != null ? Number(body.rbcCount) : null,
      wbcCount: body.wbcCount != null ? Number(body.wbcCount) : null,
      plateletCount: body.plateletCount != null ? Number(body.plateletCount) : null,
      hematocrit: body.hematocrit != null ? Number(body.hematocrit) : null,
      mcv: body.mcv != null ? Number(body.mcv) : null,
      serumIron: body.serumIron != null ? Number(body.serumIron) : null,
      vitaminA: body.vitaminA != null ? Number(body.vitaminA) : null,
      vitaminC: body.vitaminC != null ? Number(body.vitaminC) : null,
      vitaminE: body.vitaminE != null ? Number(body.vitaminE) : null,
      magnesium: body.magnesium != null ? Number(body.magnesium) : null,
      phosphorus: body.phosphorus != null ? Number(body.phosphorus) : null,
      sodium: body.sodium != null ? Number(body.sodium) : null,
      fastingBloodSugar: body.fastingBloodSugar != null ? Number(body.fastingBloodSugar) : null,
      hba1c: body.hba1c != null ? Number(body.hba1c) : null,
      creatinine: body.creatinine != null ? Number(body.creatinine) : null,
      bun: body.bun != null ? Number(body.bun) : null,
      totalCholesterol: body.totalCholesterol != null ? Number(body.totalCholesterol) : null,
      hdl: body.hdl != null ? Number(body.hdl) : null,
      ldl: body.ldl != null ? Number(body.ldl) : null,
      triglycerides: body.triglycerides != null ? Number(body.triglycerides) : null,
      tsh: body.tsh != null ? Number(body.tsh) : null,
      alt: body.alt != null ? Number(body.alt) : null,
      ast: body.ast != null ? Number(body.ast) : null,
      recoveryDuration: body.recoveryDuration != null ? Number(body.recoveryDuration) : 30,
      // foodHabits is jsonb — explicitly serialize to avoid Drizzle/pg JSON serialization issues
      foodHabits: body.foodHabits != null
        ? (typeof body.foodHabits === "object" ? JSON.parse(JSON.stringify(body.foodHabits)) : body.foodHabits)
        : null,
    };

    // ===== STEP 4: Log the final insert payload =====
    console.log("[Backend] Insert payload:", JSON.stringify(insertData, null, 2));
    console.log("[Backend] Insert payload keys:", Object.keys(insertData));

    // ===== STEP 5: Attempt the database insert =====
    const [row] = await db.insert(profilesTable).values(insertData).returning();

    // ===== STEP 7: Verify row was returned =====
    if (!row) {
      console.error("[Backend] DB insert returned no row");
      res.status(500).json({
        success: false,
        message: "Profile creation failed",
        reason: "Database insert returned no row",
      });
      return;
    }

    console.log("[Backend] Insert succeeded, row ID:", row.id);
    console.log("[Backend] Row data:", JSON.stringify(row, null, 2));

    // ===== STEP 8: Load foods and compute priorities =====
    const foods = await loadFoods();
    const result = {
      ...row,
      priorities: getPrioritiesWithFoodSources(row, foods),
    };

    // ===== STEP 9: Return 201 =====
    res.status(201).json(result);
  } catch (err: unknown) {
    // ===== CRITICAL: Full exception logging =====
    const error = err as Error;
    console.error("=".repeat(80));
    console.error("[Backend] UNHANDLED EXCEPTION in POST /api/profiles");
    console.error("[Backend] Message:", error.message);
    console.error("[Backend] Stack trace:", error.stack);
    console.error("[Backend] Name:", error.name);
    // Try to extract line number from stack
    const stackLines = (error.stack || "").split("\n");
    if (stackLines.length > 1) {
      console.error("[Backend] Failing line:", stackLines[1]?.trim());
    }
    console.error("=".repeat(80));

    res.status(500).json({
      success: false,
      message: "Profile creation failed",
      reason: error.message || "Unknown error",
    });
  }
});

router.get("/profiles/:profileId", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.profileId));
  if (!row) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const foods = await loadFoods();
  res.json({
    ...row,
    priorities: getPrioritiesWithFoodSources(row, foods),
  });
});

router.put("/profiles/:profileId", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, params.data.profileId));
  if (!existing) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  // Merge: only update fields that were provided, preserving the rest.
  const updateValues: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      // Persist the authoritative (resolved) cuisine, so an invalid/empty value
      // normalises to the permanent "Indian" default on update too.
      updateValues[key] = key === "cuisinePreference" ? resolveCuisine(value as string) : value;
    }
  }

  const [row] = await db
    .update(profilesTable)
    .set(updateValues)
    .where(eq(profilesTable.id, params.data.profileId))
    .returning();

  const foods = await loadFoods();
  res.json({
    ...row,
    priorities: getPrioritiesWithFoodSources(row, foods),
  });
});

export default router;