import { db, loansTable, timelineEventsTable } from "@workspace/db";
import { eq, lt, and, ne } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, EMAIL_TEMPLATES } from "./email";

export async function autoReleaseFundsIfDue(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(loansTable)
    .where(
      and(
        eq(loansTable.status, "EN_TRAITEMENT"),
        lt(loansTable.processingUntil, now),
      ),
    );
  for (const loan of due) {
    await db
      .update(loansTable)
      .set({
        status: "FONDS_DISPONIBLES",
        fundsAvailableAt: now,
        updatedAt: now,
      })
      .where(eq(loansTable.id, loan.id));
    await db.insert(timelineEventsTable).values({
      loanId: loan.id,
      kind: "FUNDS_AVAILABLE",
      message: "Les fonds ont été débloqués automatiquement",
    });
    const mail = EMAIL_TEMPLATES.fundsAvailable(loan.applicantName, Number(loan.amount));
    await sendEmail({ to: loan.applicantEmail, ...mail, kind: "FUNDS_AVAILABLE" });
    logger.info({ loanId: loan.id }, "Auto-released loan funds");
  }
}

export async function ensureLifecycleAdvanced(loanId: string): Promise<void> {
  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
  if (!loan) return;
  if (
    loan.status === "EN_TRAITEMENT" &&
    loan.processingUntil &&
    loan.processingUntil < new Date()
  ) {
    const now = new Date();
    await db
      .update(loansTable)
      .set({
        status: "FONDS_DISPONIBLES",
        fundsAvailableAt: now,
        updatedAt: now,
      })
      .where(and(eq(loansTable.id, loanId), ne(loansTable.status, "FONDS_DISPONIBLES")));
    await db.insert(timelineEventsTable).values({
      loanId,
      kind: "FUNDS_AVAILABLE",
      message: "Les fonds ont été débloqués automatiquement",
    });
    const mail = EMAIL_TEMPLATES.fundsAvailable(loan.applicantName, Number(loan.amount));
    await sendEmail({ to: loan.applicantEmail, ...mail, kind: "FUNDS_AVAILABLE" });
  }
}
