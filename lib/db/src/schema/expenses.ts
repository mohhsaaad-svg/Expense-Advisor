import { pgTable, serial, text, numeric, date, timestamp, integer, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recurringExpensesTable } from "./recurring";
import { usersTable } from "./auth";

export const expensesTable = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    // Owner of the record. Every query MUST be scoped by this column — the
    // server derives it from the authenticated session, never from a client.
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    date: date("date").notNull(),
    // Set when this expense was auto-logged from a recurring rule
    recurringId: integer("recurring_id").references(() => recurringExpensesTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Makes recurring materialization idempotent under concurrent requests.
    // Postgres treats NULLs as distinct, so manual expenses are unaffected.
    // A rule belongs to exactly one user, so (recurring_id, date) is already
    // per-user safe: materialized rows always inherit the rule owner's id.
    uniqueIndex("expenses_recurring_date_uq").on(table.recurringId, table.date),
    // All summaries/insights filter by owner + date window.
    index("expenses_user_date_idx").on(table.userId, table.date),
  ],
);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
