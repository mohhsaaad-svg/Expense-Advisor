import { pgTable, serial, numeric, timestamp, varchar, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// One budget row per user (get-or-create keyed by user_id).
export const budgetTable = pgTable(
  "budget",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    dailyLimit: numeric("daily_limit", { precision: 10, scale: 2 }).notNull().default("100"),
    monthlyLimit: numeric("monthly_limit", { precision: 10, scale: 2 }).notNull().default("2000"),
    // Salary anchoring: when set, budgeting runs payday -> next payday instead
    // of the calendar month. salaryDay is the day-of-month the salary lands
    // (1-31; 29-31 clamp into short months). Null = calendar-month fallback.
    salaryAmount: numeric("salary_amount", { precision: 10, scale: 2 }),
    salaryDay: integer("salary_day"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("budget_user_uq").on(table.userId)],
);

export const insertBudgetSchema = createInsertSchema(budgetTable).omit({ id: true, updatedAt: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetTable.$inferSelect;
