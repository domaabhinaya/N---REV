import { pgTable, serial, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  heightCm: real("height_cm").notNull(),
  weightKg: real("weight_kg").notNull(),
  dietType: text("diet_type").notNull(),
  allergies: text("allergies"),
  cuisinePreference: text("cuisine_preference"),
  budget: text("budget"),
  symptoms: text("symptoms").array().notNull().default([]),
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
  recoveryDuration: integer("recovery_duration").notNull().default(30),
  foodHabits: jsonb("food_habits"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileRow = typeof profilesTable.$inferSelect;
