import { pgTable, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const budgetTable = pgTable("budget", {
  id: serial("id").primaryKey(),
  dailyLimit: numeric("daily_limit", { precision: 10, scale: 2 }).notNull().default("100"),
  monthlyLimit: numeric("monthly_limit", { precision: 10, scale: 2 }).notNull().default("2000"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBudgetSchema = createInsertSchema(budgetTable).omit({ id: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetTable.$inferSelect;
