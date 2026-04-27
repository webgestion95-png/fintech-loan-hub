import { pgTable, text, timestamp, uuid, numeric, pgEnum } from "drizzle-orm/pg-core";
import { loansTable } from "./loans";
import { usersTable } from "./users";

export const withdrawalTypeEnum = pgEnum("withdrawal_type", ["INSTANT", "CLASSIQUE"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "PROGRAMME",
  "EN_COURS",
  "EXECUTE",
  "ECHOUE",
]);

export const withdrawalsTable = pgTable("withdrawals", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loansTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 14, scale: 2 }).notNull().default("0"),
  type: withdrawalTypeEnum("type").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("EN_COURS"),
  beneficiaryName: text("beneficiary_name").notNull(),
  iban: text("iban").notNull(),
  bic: text("bic").notNull(),
  reference: text("reference"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Withdrawal = typeof withdrawalsTable.$inferSelect;
export type InsertWithdrawal = typeof withdrawalsTable.$inferInsert;
