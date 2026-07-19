import { pgTable, serial, text, numeric, date, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recurringExpensesTable } from "./recurring";

export const expensesTable = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
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
    uniqueIndex("expenses_recurring_date_uq").on(table.recurringId, table.date),
  ],
);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
