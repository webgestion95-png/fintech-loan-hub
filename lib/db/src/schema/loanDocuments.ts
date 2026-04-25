import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { loansTable } from "./loans";

export const loanDocumentsTable = pgTable("loan_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loansTable.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LoanDocument = typeof loanDocumentsTable.$inferSelect;
