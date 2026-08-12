import { pgTable, serial, integer, real, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const labComparisonsTable = pgTable("lab_comparisons", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  labType: text("lab_type").notNull(),
  hemoglobin: real("hemoglobin"),
  ferritin: real("ferritin"),
  vitaminB12Level: real("vitamin_b12_level"),
  vitaminDLevel: real("vitamin_d_level"),
  serumCalcium: real("serum_calcium"),
  totalProtein: real("total_protein"),
  rbcCount: real("rbc_count"),
  wbcCount: real("wbc_count"),
  plateletCount: real("platelet_count"),
  hematocrit: real("hematocrit"),
  mcv: real("mcv"),
  serumIron: real("serum_iron"),
  vitaminA: real("vitamin_a"),
  vitaminC: real("vitamin_c"),
  vitaminE: real("vitamin_e"),
  magnesium: real("magnesium"),
  phosphorus: real("phosphorus"),
  sodium: real("sodium"),
  fastingBloodSugar: real("fasting_blood_sugar"),
  hba1c: real("hba1c"),
  creatinine: real("creatinine"),
  bun: real("bun"),
  totalCholesterol: real("total_cholesterol"),
  hdl: real("hdl"),
  ldl: real("ldl"),
  triglycerides: real("triglycerides"),
  tsh: real("tsh"),
  alt: real("alt"),
  ast: real("ast"),
  recordedAt: date("recorded_at", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLabComparisonSchema = createInsertSchema(labComparisonsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLabComparison = z.infer<typeof insertLabComparisonSchema>;
export type LabComparisonRow = typeof labComparisonsTable.$inferSelect;
