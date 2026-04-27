import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminTwoFactorTable = pgTable("admin_two_factor", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  secret: text("secret").notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminTwoFactor = typeof adminTwoFactorTable.$inferSelect;
export type InsertAdminTwoFactor = typeof adminTwoFactorTable.$inferInsert;

export const adminAuditLogTable = pgTable("admin_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  email: text("email"),
  action: text("action").notNull(),
  success: text("success").notNull().default("true"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogTable.$inferSelect;
