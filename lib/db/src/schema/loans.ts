import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loanStatusEnum = pgEnum("loan_status", [
  "EN_ATTENTE",
  "ACCEPTE",
  "REFUSE",
  "CONTRAT_ENVOYE",
  "CONTRAT_SIGNE",
  "EN_TRAITEMENT",
  "FONDS_DISPONIBLES",
]);

export const loansTable = pgTable("loans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  durationMonths: integer("duration_months").notNull(),
  monthlyIncome: numeric("monthly_income", { precision: 14, scale: 2 }).notNull(),
  purpose: text("purpose"),
  status: loanStatusEnum("status").notNull().default("EN_ATTENTE"),
  adminNote: text("admin_note"),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  contractSignedAt: timestamp("contract_signed_at", { withTimezone: true }),
  processingUntil: timestamp("processing_until", { withTimezone: true }),
  fundsAvailableAt: timestamp("funds_available_at", { withTimezone: true }),
  withdrawnAmount: numeric("withdrawn_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Loan = typeof loansTable.$inferSelect;
export type InsertLoan = typeof loansTable.$inferInsert;
