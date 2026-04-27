import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  FileSignature,
  FileCheck2,
  Wallet,
  Hourglass,
  Send,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LoanStatus =
  | "EN_ATTENTE"
  | "ACCEPTE"
  | "REFUSE"
  | "CONTRAT_ENVOYE"
  | "CONTRAT_SIGNE"
  | "EN_TRAITEMENT"
  | "FONDS_DISPONIBLES";

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "primary";

export const TONE_CLASSES: Record<StatusTone, { bg: string; text: string; border: string; dot: string }> = {
  neutral: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  info: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  danger: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
  primary: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
  },
};

export const LOAN_STATUS: Record<
  LoanStatus,
  { label: string; tone: StatusTone; icon: LucideIcon; description: string }
> = {
  EN_ATTENTE: {
    label: "Étude du dossier",
    tone: "warning",
    icon: Hourglass,
    description: "Votre demande est en cours d'analyse par nos services",
  },
  ACCEPTE: {
    label: "Accord de principe",
    tone: "success",
    icon: CheckCircle2,
    description: "Votre dossier a reçu un accord de principe",
  },
  REFUSE: {
    label: "Demande refusée",
    tone: "danger",
    icon: XCircle,
    description: "Demande non retenue après étude",
  },
  CONTRAT_ENVOYE: {
    label: "Contrat reçu",
    tone: "info",
    icon: Send,
    description: "Votre contrat de prêt est disponible pour signature",
  },
  CONTRAT_SIGNE: {
    label: "Contrat signé",
    tone: "primary",
    icon: FileCheck2,
    description: "Contrat signé enregistré — préparation du déblocage",
  },
  EN_TRAITEMENT: {
    label: "Validation finale",
    tone: "warning",
    icon: Loader2,
    description: "Validation finale en cours — délai estimé 72h",
  },
  FONDS_DISPONIBLES: {
    label: "Fonds disponibles",
    tone: "success",
    icon: Wallet,
    description: "Vos fonds sont disponibles pour retrait",
  },
};

export const LOAN_STEPS: Array<{ id: LoanStatus; label: string; icon: LucideIcon }> = [
  { id: "EN_ATTENTE", label: "Demande déposée", icon: FileSignature },
  { id: "ACCEPTE", label: "Accord de principe", icon: CheckCircle2 },
  { id: "CONTRAT_ENVOYE", label: "Contrat reçu", icon: Send },
  { id: "CONTRAT_SIGNE", label: "Contrat signé", icon: FileCheck2 },
  { id: "EN_TRAITEMENT", label: "Validation finale", icon: Clock },
  { id: "FONDS_DISPONIBLES", label: "Fonds disponibles", icon: Wallet },
];

export function getStepState(currentStatus: LoanStatus, stepId: LoanStatus): "done" | "current" | "pending" {
  const order = LOAN_STEPS.map((s) => s.id);
  const ci = order.indexOf(currentStatus);
  const si = order.indexOf(stepId);
  if (ci < 0 || si < 0) return "pending";
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "pending";
}

// Withdrawal helpers
export const WITHDRAWAL_STATUS: Record<
  string,
  { label: string; tone: StatusTone; icon: LucideIcon }
> = {
  PROGRAMME: { label: "Programmé", tone: "info", icon: Clock },
  EN_COURS: { label: "En cours", tone: "warning", icon: Loader2 },
  EXECUTE: { label: "Exécuté", tone: "success", icon: CheckCircle2 },
  ECHOUE: { label: "Échoué", tone: "danger", icon: XCircle },
};
