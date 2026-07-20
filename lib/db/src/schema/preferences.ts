import { pgTable, serial, text, integer, timestamp, varchar, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

// One settings row per user (get-or-create keyed by user_id).
export const preferencesTable = pgTable(
  "preferences",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // ISO 4217 code used for display formatting on the clients and in
    // server-generated tip/alert messages
    currency: text("currency").notNull().default("USD"),
    // Percent of the daily limit at which "approaching limit" warnings fire (50-100)
    alertThreshold: integer("alert_threshold").notNull().default(80),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("preferences_user_uq").on(table.userId)],
);

export const insertPreferencesSchema = createInsertSchema(preferencesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type Preferences = typeof preferencesTable.$inferSelect;
