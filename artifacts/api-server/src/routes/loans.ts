import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  loansTable,
  loanDocumentsTable,
  contractsTable,
  timelineEventsTable,
} from "@workspace/db";
import {
  CreateLoanBody,
  GetLoanParams,
  UploadSignedContractBody,
  UploadSignedContractParams,
  WithdrawFundsBody,
  WithdrawFundsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeLoan } from "../lib/loanSerializer";
import { sendEmail, EMAIL_TEMPLATES } from "../lib/email";
import { ensureLifecycleAdvanced } from "../lib/loanLifecycle";

const router: IRouter = Router();

router.get("/loans", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const loans = await db
    .select()
    .from(loansTable)
    .where(eq(loansTable.userId, user.id))
    .orderBy(desc(loansTable.createdAt));
  res.json(loans.map(serializeLoan));
});

router.post("/loans", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [loan] = await db
    .insert(loansTable)
    .values({
      userId: user.id,
      applicantName: data.applicantName,
      applicantEmail: data.applicantEmail,
      amount: data.amount.toString(),
      durationMonths: data.durationMonths,
      monthlyIncome: data.monthlyIncome.toString(),
      purpose: data.purpose ?? null,
    })
    .returning();
  if (!loan) {
    res.status(500).json({ error: "Failed to create loan" });
    return;
  }
  if (data.documents.length) {
    await db.insert(loanDocumentsTable).values(
      data.documents.map((d) => ({
        loanId: loan.id,
        filename: d.filename,
        contentType: d.contentType,
        dataBase64: d.dataBase64,
      })),
    );
  }
  await db.insert(timelineEventsTable).values({
    loanId: loan.id,
    kind: "SUBMITTED",
    message: "Demande de prêt déposée",
  });
  res.status(201).json(serializeLoan(loan));
});

router.get("/loans/:id", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const params = GetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await ensureLifecycleAdvanced(params.data.id);
  const [loan] = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, user.id)));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const docs = await db
    .select()
    .from(loanDocumentsTable)
    .where(eq(loanDocumentsTable.loanId, loan.id));
  const contracts = await db
    .select()
    .from(contractsTable)
    .where(eq(contractsTable.loanId, loan.id));
  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(eq(timelineEventsTable.loanId, loan.id))
    .orderBy(desc(timelineEventsTable.createdAt));
  const generated = contracts.find((c) => c.kind === "GENERATED") ?? null;
  const signed = contracts.find((c) => c.kind === "SIGNED") ?? null;
  res.json({
    ...serializeLoan(loan),
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

router.post(
  "/loans/:id/upload-signed-contract",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.currentUser!;
    const params = UploadSignedContractParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const body = UploadSignedContractBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [loan] = await db
      .select()
      .from(loansTable)
      .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, user.id)));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (loan.status !== "CONTRAT_ENVOYE") {
      res.status(400).json({ error: "Le contrat ne peut être uploadé qu'après envoi" });
      return;
    }
    await db
      .delete(contractsTable)
      .where(and(eq(contractsTable.loanId, loan.id), eq(contractsTable.kind, "SIGNED")));
    await db.insert(contractsTable).values({
      loanId: loan.id,
      kind: "SIGNED",
      filename: body.data.filename,
      contentType: body.data.contentType,
      dataBase64: body.data.dataBase64,
    });
    const now = new Date();
    const [updated] = await db
      .update(loansTable)
      .set({ status: "CONTRAT_SIGNE", contractSignedAt: now, updatedAt: now })
      .where(eq(loansTable.id, loan.id))
      .returning();
    await db.insert(timelineEventsTable).values({
      loanId: loan.id,
      kind: "CONTRACT_SIGNED",
      message: "Contrat signé reçu",
    });
    res.json(serializeLoan(updated!));
  },
);

router.post("/loans/:id/withdraw", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const params = WithdrawFundsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = WithdrawFundsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  await ensureLifecycleAdvanced(params.data.id);
  const [loan] = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, params.data.id), eq(loansTable.userId, user.id)));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (loan.status !== "FONDS_DISPONIBLES") {
    res.status(400).json({ error: "Les fonds ne sont pas encore disponibles" });
    return;
  }
  const total = Number(loan.amount);
  const already = Number(loan.withdrawnAmount);
  const remaining = total - already;
  if (body.data.amount > remaining + 0.0001) {
    res.status(400).json({ error: `Montant supérieur au solde disponible (${remaining.toFixed(2)} €)` });
    return;
  }
  const newWithdrawn = (already + body.data.amount).toString();
  const [updated] = await db
    .update(loansTable)
    .set({ withdrawnAmount: newWithdrawn, updatedAt: new Date() })
    .where(eq(loansTable.id, loan.id))
    .returning();
  await db.insert(timelineEventsTable).values({
    loanId: loan.id,
    kind: "WITHDRAWAL",
    message: `Retrait de ${body.data.amount.toFixed(2)} € effectué`,
  });
  void sendEmail({
    to: loan.applicantEmail,
    subject: "Retrait effectué",
    text: `Bonjour ${loan.applicantName},\n\nUn retrait de ${body.data.amount.toFixed(2)} € a bien été effectué depuis votre prêt LoanFlow.\n\nL'équipe LoanFlow`,
    kind: "FUNDS_AVAILABLE",
  });
  res.json(serializeLoan(updated!));
});

router.get("/loans/:id/contract.pdf", requireAuth, async (req, res): Promise<void> => {
  const user = req.currentUser!;
  const params = GetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [loan] = await db
    .select()
    .from(loansTable)
    .where(eq(loansTable.id, params.data.id));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (loan.userId !== user.id && user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [contract] = await db
    .select()
    .from(contractsTable)
    .where(and(eq(contractsTable.loanId, loan.id), eq(contractsTable.kind, "GENERATED")));
  if (!contract) {
    res.status(404).json({ error: "Contract not yet generated" });
    return;
  }
  res.setHeader("Content-Type", contract.contentType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${contract.filename}"`,
  );
  res.send(Buffer.from(contract.dataBase64, "base64"));
});

router.get(
  "/loans/:loanId/documents/:docId",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.currentUser!;
    const loanId = Array.isArray(req.params["loanId"])
      ? req.params["loanId"][0]
      : req.params["loanId"];
    const docId = Array.isArray(req.params["docId"])
      ? req.params["docId"][0]
      : req.params["docId"];
    if (!loanId || !docId) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (loan.userId !== user.id && user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [doc] = await db
      .select()
      .from(loanDocumentsTable)
      .where(and(eq(loanDocumentsTable.id, docId), eq(loanDocumentsTable.loanId, loanId)));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.setHeader("Content-Type", doc.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${doc.filename}"`);
    res.send(Buffer.from(doc.dataBase64, "base64"));
  },
);

router.get(
  "/loans/:loanId/signed-contract",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = req.currentUser!;
    const loanId = Array.isArray(req.params["loanId"])
      ? req.params["loanId"][0]
      : req.params["loanId"];
    if (!loanId) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, loanId));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (loan.userId !== user.id && user.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [contract] = await db
      .select()
      .from(contractsTable)
      .where(and(eq(contractsTable.loanId, loan.id), eq(contractsTable.kind, "SIGNED")));
    if (!contract) {
      res.status(404).json({ error: "Signed contract not found" });
      return;
    }
    res.setHeader("Content-Type", contract.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${contract.filename}"`);
    res.send(Buffer.from(contract.dataBase64, "base64"));
  },
);

export default router;
