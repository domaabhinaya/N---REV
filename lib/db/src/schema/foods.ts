import { pgTable, serial, text, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const foodsTable = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  servingSize: text("serving_size").notNull(),
  protein: real("protein").notNull(),
  iron: real("iron").notNull(),
  calcium: real("calcium").notNull(),
  vitaminD: real("vitamin_d").notNull(),
  magnesium: real("magnesium"),
  vitaminA: real("vitamin_a"),
  vitaminC: real("vitamin_c"),
  vitaminB7: real("vitamin_b7"),
  vitaminE: real("vitamin_e"),
  vitaminK: real("vitamin_k"),
  vitaminB12: real("vitamin_b12"),
  vitaminB1: real("vitamin_b1"),
  vitaminB2: real("vitamin_b2"),
  vitaminB3: real("vitamin_b3"),
  vitaminB6: real("vitamin_b6"),
  dietTags: text("diet_tags").array().notNull().default([]),
  mealTags: text("meal_tags").array().notNull().default([]),
  cuisineTags: text("cuisine_tags").array().notNull().default([]),
  tier: text("tier").notNull().default("primary"),
  source: text("source"),
});

export const insertFoodSchema = createInsertSchema(foodsTable).omit({ id: true });
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type FoodRow = typeof foodsTable.$inferSelect;
