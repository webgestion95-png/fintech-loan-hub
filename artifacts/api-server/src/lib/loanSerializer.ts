import { type Loan } from "@workspace/db";

export function serializeLoan(loan: Loan): {
  id: string;
  applicantName: string;
  applicantEmail: string;
  amount: number;
  durationMonths: number;
  monthlyIncome: number;
  purpose: string | null;
  status: Loan["status"];
  decisionAt: string | null;
  contractSignedAt: string | null;
  fundsAvailableAt: string | null;
  processingUntil: string | null;
  withdrawnAmount: number;
  availableBalance: number;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
} {
  const amount = Number(loan.amount);
  const withdrawn = Number(loan.withdrawnAmount);
  const available = loan.status === "FONDS_DISPONIBLES" ? Math.max(amount - withdrawn, 0) : 0;
  return {
    id: loan.id,
    applicantName: loan.applicantName,
    applicantEmail: loan.applicantEmail,
    amount,
    durationMonths: loan.durationMonths,
    monthlyIncome: Number(loan.monthlyIncome),
    purpose: loan.purpose,
    status: loan.status,
    decisionAt: loan.decisionAt ? loan.decisionAt.toISOString() : null,
    contractSignedAt: loan.contractSignedAt ? loan.contractSignedAt.toISOString() : null,
    fundsAvailableAt: loan.fundsAvailableAt ? loan.fundsAvailableAt.toISOString() : null,
    processingUntil: loan.processingUntil ? loan.processingUntil.toISOString() : null,
    withdrawnAmount: withdrawn,
    availableBalance: available,
    adminNote: loan.adminNote,
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };
}
