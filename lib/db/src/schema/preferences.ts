import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Single-row settings table (get-or-create pattern, same as budget)
export const preferencesTable = pgTable("preferences", {
  id: serial("id").primaryKey(),
  // ISO 4217 code used for display formatting on the clients
  currency: text("currency").notNull().default("USD"),
  // Percent of the daily limit at which "approaching limit" warnings fire (50-100)
  alertThreshold: integer("alert_threshold").notNull().default(80),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPreferencesSchema = createInsertSchema(preferencesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type Preferences = typeof preferencesTable.$inferSelect;
