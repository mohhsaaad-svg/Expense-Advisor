import { pgTable, serial, text, integer, date, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// No-spend challenges. Progress/status are computed at read time from the
// owner's expenses — a challenge fails the moment a matching expense is
// logged inside its window, completes when the window ends clean.
export const challengesTable = pgTable(
  "challenges",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Category the challenge blocks; NULL means all spending counts
    category: text("category"),
    startDate: date("start_date").notNull(),
    durationDays: integer("duration_days").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("challenges_user_idx").on(table.userId)],
);

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ id: true, createdAt: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type ChallengeRow = typeof challengesTable.$inferSelect;
