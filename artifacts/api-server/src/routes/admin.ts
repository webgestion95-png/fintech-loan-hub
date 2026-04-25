import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  loansTable,
  usersTable,
  loanDocumentsTable,
  contractsTable,
  timelineEventsTable,
} from "@workspace/db";
import {
  AdminGetLoanParams,
  AdminDecideLoanParams,
  AdminDecideLoanBody,
  AdminAdvanceStatusParams,
  AdminAdvanceStatusBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { serializeLoan } from "../lib/loanSerializer";
import { sendEmail, EMAIL_TEMPLATES } from "../lib/email";
import { generateContractPdf } from "../lib/contractPdf";
import { autoReleaseFundsIfDue } from "../lib/loanLifecycle";

const router: IRouter = Router();

router.get("/admin/loans", requireAdmin, async (_req, res): Promise<void> => {
  await autoReleaseFundsIfDue();
  const rows = await db
    .select({ loan: loansTable, user: usersTable })
    .from(loansTable)
    .leftJoin(usersTable, eq(loansTable.userId, usersTable.id))
    .orderBy(desc(loansTable.createdAt));
  res.json(
    rows.map((r) => ({
      ...serializeLoan(r.loan),
      userEmail: r.user?.email ?? r.loan.applicantEmail,
      userFullName: r.user?.fullName ?? null,
    })),
  );
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  await autoReleaseFundsIfDue();
  const all = await db.select().from(loansTable);
  const byStatus = (s: string) => all.filter((l) => l.status === s).length;
  const sumAmount = (filterFn: (l: typeof all[number]) => boolean): number =>
    all.filter(filterFn).reduce((acc, l) => acc + Number(l.amount), 0);
  const totalDisbursed = all.reduce((acc, l) => acc + Number(l.withdrawnAmount), 0);
  res.json({
    totalLoans: all.length,
    pending: byStatus("EN_ATTENTE"),
    accepted: byStatus("ACCEPTE"),
    refused: byStatus("REFUSE"),
    contractSent: byStatus("CONTRAT_ENVOYE"),
    contractSigned: byStatus("CONTRAT_SIGNE"),
    processing: byStatus("EN_TRAITEMENT"),
    fundsAvailable: byStatus("FONDS_DISPONIBLES"),
    totalAmountRequested: sumAmount(() => true),
    totalAmountAccepted: sumAmount((l) => l.status !== "EN_ATTENTE" && l.status !== "REFUSE"),
    totalDisbursed,
  });
});

router.get("/admin/activity", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({ event: timelineEventsTable, loan: loansTable })
    .from(timelineEventsTable)
    .leftJoin(loansTable, eq(timelineEventsTable.loanId, loansTable.id))
    .orderBy(desc(timelineEventsTable.createdAt))
    .limit(40);
  res.json(
    rows.map((r) => ({
      id: r.event.id,
      loanId: r.event.loanId,
      applicantName: r.loan?.applicantName ?? "—",
      kind: r.event.kind,
      message: r.event.message,
      createdAt: r.event.createdAt.toISOString(),
    })),
  );
});

router.get("/admin/loans/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminGetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({ loan: loansTable, user: usersTable })
    .from(loansTable)
    .leftJoin(usersTable, eq(loansTable.userId, usersTable.id))
    .where(eq(loansTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const docs = await db
    .select()
    .from(loanDocumentsTable)
    .where(eq(loanDocumentsTable.loanId, row.loan.id));
  const contracts = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.loanId, row.loan.id));
  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(eq(timelineEventsTable.loanId, row.loan.id))
    .orderBy(desc(timelineEventsTable.createdAt));
  const generated = contracts.find((c) => c.kind === "GENERATED") ?? null;
  const signed = contracts.find((c) => c.kind === "SIGNED") ?? null;
  res.json({
    ...serializeLoan(row.loan),
    userEmail: row.user?.email ?? row.loan.applicantEmail,
    userFullName: row.user?.fullName ?? null,
    documents: docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      contentType: d.contentType,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    generatedContract: generated
      ? {
          id: generated.id,
          filename: generated.filename,
          uploadedAt: generated.uploadedAt.toISOString(),
        }
      : null,
    signedContract: signed
      ? {
          id: signed.id,
          filename: signed.filename,
          uploadedAt: signed.uploadedAt.toISOString(),
        }
      : null,
    timeline: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      message: e.message,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.patch(
  "/admin/loans/:id/decision",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = AdminDecideLoanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = AdminDecideLoanBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .select({ loan: loansTable, user: usersTable })
      .from(loansTable)
      .leftJoin(usersTable, eq(loansTable.userId, usersTable.id))
      .where(eq(loansTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (row.loan.status !== "EN_ATTENTE") {
      res.status(400).json({ error: "Décision déjà prise" });
      return;
    }
    const now = new Date();
    if (body.data.decision === "REFUSE") {
      const [updated] = await db
        .update(loansTable)
        .set({
          status: "REFUSE",
          decisionAt: now,
          adminNote: body.data.adminNote ?? null,
          updatedAt: now,
        })
        .where(eq(loansTable.id, row.loan.id))
        .returning();
      await db.insert(timelineEventsTable).values({
        loanId: row.loan.id,
        kind: "REFUSED",
        message: "Demande refusée par l'équipe",
      });
      const mail = EMAIL_TEMPLATES.refused(row.loan.applicantName, body.data.adminNote ?? null);
      await sendEmail({ to: row.loan.applicantEmail, ...mail, kind: "REFUSED" });
      res.json({
        ...serializeLoan(updated!),
        userEmail: row.user?.email ?? row.loan.applicantEmail,
        userFullName: row.user?.fullName ?? null,
      });
      return;
    }
    const [updated] = await db
      .update(loansTable)
      .set({
        status: "ACCEPTE",
        decisionAt: now,
        adminNote: body.data.adminNote ?? null,
        updatedAt: now,
      })
      .where(eq(loansTable.id, row.loan.id))
      .returning();
    await db.insert(timelineEventsTable).values({
      loanId: row.loan.id,
      kind: "ACCEPTED",
      message: "Demande acceptée par l'équipe",
    });
    const mail = EMAIL_TEMPLATES.accepted(
      row.loan.applicantName,
      Number(row.loan.amount),
      row.loan.durationMonths,
    );
    await sendEmail({ to: row.loan.applicantEmail, ...mail, kind: "ACCEPTED" });
    res.json({
      ...serializeLoan(updated!),
      userEmail: row.user?.email ?? row.loan.applicantEmail,
      userFullName: row.user?.fullName ?? null,
    });
  },
);

router.post(
  "/admin/loans/:id/advance",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = AdminAdvanceStatusParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = AdminAdvanceStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [row] = await db
      .select({ loan: loansTable, user: usersTable })
      .from(loansTable)
      .leftJoin(usersTable, eq(loansTable.userId, usersTable.id))
      .where(eq(loansTable.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    const loan = row.loan;
    const now = new Date();

    if (body.data.action === "SEND_CONTRACT") {
      if (loan.status !== "ACCEPTE") {
        res.status(400).json({ error: "Le prêt doit être accepté avant l'envoi du contrat" });
        return;
      }
      const pdfBuffer = await generateContractPdf(loan, row.user?.fullName ?? null);
      await db
        .delete(contractsTable)
        .where(and(eq(contractsTable.loanId, loan.id), eq(contractsTable.kind, "GENERATED")));
      await db.insert(contractsTable).values({
        loanId: loan.id,
        kind: "GENERATED",
        filename: `contrat-loanflow-${loan.id.slice(0, 8)}.pdf`,
        contentType: "application/pdf",
        dataBase64: pdfBuffer.toString("base64"),
      });
      const [updated] = await db
        .update(loansTable)
        .set({ status: "CONTRAT_ENVOYE", updatedAt: now })
        .where(eq(loansTable.id, loan.id))
        .returning();
      await db.insert(timelineEventsTable).values({
        loanId: loan.id,
        kind: "CONTRACT_SENT",
        message: "Contrat généré et envoyé à l'emprunteur",
      });
      const contractMail = EMAIL_TEMPLATES.contractSent(loan.applicantName);
      await sendEmail({
        to: loan.applicantEmail,
        ...contractMail,
        kind: "CONTRACT_SENT",
        attachments: [
          {
            filename: `contrat-loanflow-${loan.id.slice(0, 8)}.pdf`,
            contentBase64: pdfBuffer.toString("base64"),
          },
        ],
      });
      const sigMail = EMAIL_TEMPLATES.signatureRequest(loan.applicantName);
      await sendEmail({ to: loan.applicantEmail, ...sigMail, kind: "SIGNATURE_REQUEST" });
      res.json({
        ...serializeLoan(updated!),
        userEmail: row.user?.email ?? loan.applicantEmail,
        userFullName: row.user?.fullName ?? null,
      });
      return;
    }

    if (body.data.action === "START_PROCESSING") {
      if (loan.status !== "CONTRAT_SIGNE") {
        res.status(400).json({ error: "Le contrat signé est requis pour démarrer le traitement" });
        return;
      }
      const processingUntil = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const [updated] = await db
        .update(loansTable)
        .set({ status: "EN_TRAITEMENT", processingUntil, updatedAt: now })
        .where(eq(loansTable.id, loan.id))
        .returning();
      await db.insert(timelineEventsTable).values({
        loanId: loan.id,
        kind: "PROCESSING",
        message: "Traitement du dossier démarré (72h)",
      });
      const mail = EMAIL_TEMPLATES.processing(loan.applicantName);
      await sendEmail({ to: loan.applicantEmail, ...mail, kind: "PROCESSING" });
      res.json({
        ...serializeLoan(updated!),
        userEmail: row.user?.email ?? loan.applicantEmail,
        userFullName: row.user?.fullName ?? null,
      });
      return;
    }

    if (body.data.action === "RELEASE_FUNDS") {
      if (loan.status !== "EN_TRAITEMENT" && loan.status !== "CONTRAT_SIGNE") {
        res.status(400).json({ error: "Le traitement doit être en cours pour débloquer les fonds" });
        return;
      }
      const [updated] = await db
        .update(loansTable)
        .set({ status: "FONDS_DISPONIBLES", fundsAvailableAt: now, updatedAt: now })
        .where(eq(loansTable.id, loan.id))
        .returning();
      await db.insert(timelineEventsTable).values({
        loanId: loan.id,
        kind: "FUNDS_AVAILABLE",
        message: "Fonds débloqués manuellement par l'équipe",
      });
      const mail = EMAIL_TEMPLATES.fundsAvailable(loan.applicantName, Number(loan.amount));
      await sendEmail({ to: loan.applicantEmail, ...mail, kind: "FUNDS_AVAILABLE" });
      res.json({
        ...serializeLoan(updated!),
        userEmail: row.user?.email ?? loan.applicantEmail,
        userFullName: row.user?.fullName ?? null,
      });
      return;
    }

    res.status(400).json({ error: "Action inconnue" });
  },
);

// Suppress unused import warning if drizzle-helpers vary
void sql;

export default router;
