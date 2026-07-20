import { pgTable, serial, text, numeric, date, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const goalsTable = pgTable(
  "goals",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 12, scale: 3 }).notNull(),
    savedAmount: numeric("saved_amount", { precision: 12, scale: 3 }).notNull().default("0"),
    // Optional target date for the goal (YYYY-MM-DD)
    deadline: date("deadline"),
    // Optional fixed amount to reserve each pay cycle (for open-ended goals)
    perPaydayAmount: numeric("per_payday_amount", { precision: 12, scale: 3 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("goals_user_idx").on(table.userId)],
);

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type GoalRow = typeof goalsTable.$inferSelect;
