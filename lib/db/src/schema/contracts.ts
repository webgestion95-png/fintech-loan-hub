import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { loansTable } from "./loans";

export const contractKindEnum = pgEnum("contract_kind", ["GENERATED", "SIGNED"]);

export const contractsTable = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loansTable.id, { onDelete: "cascade" }),
  kind: contractKindEnum("kind").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Contract = typeof contractsTable.$inferSelect;
