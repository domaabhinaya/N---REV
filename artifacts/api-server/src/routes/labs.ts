import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, profilesTable, labComparisonsTable } from "@workspace/db";
import { ListLabComparisonsParams, CreateLabComparisonParams, CreateLabComparisonBody } from "@workspace/api-zod";
import { compareLabValues } from "../lib/lab-insights";
import { toDateString, todayStr } from "../lib/date-utils";

const router: IRouter = Router();

router.get("/profiles/:profileId/lab-comparisons", async (req, res): Promise<void> => {
  const params = ListLabComparisonsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(labComparisonsTable)
    .where(eq(labComparisonsTable.profileId, params.data.profileId))
    .orderBy(desc(labComparisonsTable.recordedAt));

  const baselineRow = [...rows].reverse().find((r) => r.labType === "baseline") ?? null;

  const result = rows.map((row) => ({
    ...row,
    insights: compareLabValues(row.labType === "baseline" ? null : baselineRow, row),
  }));

  res.json(result);
});

router.post("/profiles/:profileId/lab-comparisons", async (req, res): Promise<void> => {
  const params = CreateLabComparisonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.profileId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const parsed = CreateLabComparisonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(labComparisonsTable)
    .where(and(eq(labComparisonsTable.profileId, params.data.profileId), eq(labComparisonsTable.labType, "baseline")));

  const [row] = await db
    .insert(labComparisonsTable)
    .values({
      profileId: params.data.profileId,
      labType: parsed.data.labType,
      hemoglobin: parsed.data.hemoglobin,
      ferritin: parsed.data.ferritin,
      vitaminB12Level: parsed.data.vitaminB12Level,
      vitaminDLevel: parsed.data.vitaminDLevel,
      serumCalcium: parsed.data.serumCalcium,
      totalProtein: parsed.data.totalProtein,
      rbcCount: parsed.data.rbcCount,
      wbcCount: parsed.data.wbcCount,
      plateletCount: parsed.data.plateletCount,
      hematocrit: parsed.data.hematocrit,
      mcv: parsed.data.mcv,
      serumIron: parsed.data.serumIron,
      vitaminA: parsed.data.vitaminA,
      vitaminC: parsed.data.vitaminC,
      vitaminE: parsed.data.vitaminE,
      magnesium: parsed.data.magnesium,
      phosphorus: parsed.data.phosphorus,
      sodium: parsed.data.sodium,
      fastingBloodSugar: parsed.data.fastingBloodSugar,
      hba1c: parsed.data.hba1c,
      creatinine: parsed.data.creatinine,
      bun: parsed.data.bun,
      totalCholesterol: parsed.data.totalCholesterol,
      hdl: parsed.data.hdl,
      ldl: parsed.data.ldl,
      triglycerides: parsed.data.triglycerides,
      tsh: parsed.data.tsh,
      alt: parsed.data.alt,
      ast: parsed.data.ast,
      recordedAt: toDateString(parsed.data.recordedAt) ?? todayStr(),
    })
    .returning();

  const baseline = row.labType === "baseline" ? null : (existing[0] ?? null);
  const insights = compareLabValues(baseline, row);

  res.status(201).json({ ...row, insights });
});

export default router;
