import { pgTable, serial, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }).notNull(),
  savedAmount: numeric("saved_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  // Optional target date for the goal (YYYY-MM-DD)
  deadline: date("deadline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type GoalRow = typeof goalsTable.$inferSelect;
