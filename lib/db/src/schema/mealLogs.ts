import { pgTable, serial, integer, real, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mealLogsTable = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  mealType: text("meal_type").notNull(),
  // Dataset-backed food id. Nullable so manual custom foods can be logged without a dataset entry.
  foodId: integer("food_id"),
  // Manual custom food support: a free-text name (and optional label) entered by the user.
  customFoodName: text("custom_food_name"),
  customLabel: text("custom_label"),
  servings: real("servings").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMealLogSchema = createInsertSchema(mealLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type MealLogRow = typeof mealLogsTable.$inferSelect;