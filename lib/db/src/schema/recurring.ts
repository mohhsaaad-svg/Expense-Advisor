import { pgTable, serial, text, numeric, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recurringExpensesTable = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  // daily | weekly | monthly
  frequency: text("frequency").notNull(),
  // Anchor date: first occurrence; weekly repeats on this weekday, monthly on this day-of-month (clamped)
  startDate: date("start_date").notNull(),
  active: boolean("active").notNull().default(true),
  // High-water mark for materialization (occurrences up to this date have been generated)
  lastMaterializedDate: date("last_materialized_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecurringExpenseSchema = createInsertSchema(recurringExpensesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;
export type RecurringExpense = typeof recurringExpensesTable.$inferSelect;
