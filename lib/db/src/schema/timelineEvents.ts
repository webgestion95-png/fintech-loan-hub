import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { loansTable } from "./loans";

export const timelineEventsTable = pgTable("timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  loanId: uuid("loan_id")
    .notNull()
    .references(() => loansTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TimelineEvent = typeof timelineEventsTable.$inferSelect;
