import { pgTable, text, timestamp, uuid, numeric, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  role: userRoleEnum("role").notNull().default("USER"),
  walletBalance: numeric("wallet_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
