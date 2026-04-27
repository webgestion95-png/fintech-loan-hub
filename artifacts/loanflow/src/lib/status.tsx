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
    label: "En attente",
    tone: "warning",
    icon: Hourglass,
    description: "Votre demande est en cours d'examen",
  },
  ACCEPTE: {
    label: "Acceptée",
    tone: "success",
    icon: CheckCircle2,
    description: "Votre demande a été acceptée",
  },
  REFUSE: {
    label: "Refusée",
    tone: "danger",
    icon: XCircle,
    description: "Demande non aboutie",
  },
  CONTRAT_ENVOYE: {
    label: "Contrat envoyé",
    tone: "info",
    icon: Send,
    description: "Le contrat vous a été envoyé pour signature",
  },
  CONTRAT_SIGNE: {
    label: "Contrat signé",
    tone: "primary",
    icon: FileCheck2,
    description: "Contrat signé reçu, déblocage en préparation",
  },
  EN_TRAITEMENT: {
    label: "En traitement",
    tone: "warning",
    icon: Loader2,
    description: "Mise à disposition des fonds sous 72h",
  },
  FONDS_DISPONIBLES: {
    label: "Fonds disponibles",
    tone: "success",
    icon: Wallet,
    description: "Vos fonds sont disponibles",
  },
};

export const LOAN_STEPS: Array<{ id: LoanStatus; label: string; icon: LucideIcon }> = [
  { id: "EN_ATTENTE", label: "Demande déposée", icon: FileSignature },
  { id: "ACCEPTE", label: "Acceptée", icon: CheckCircle2 },
  { id: "CONTRAT_ENVOYE", label: "Contrat envoyé", icon: Send },
  { id: "CONTRAT_SIGNE", label: "Contrat signé", icon: FileCheck2 },
  { id: "EN_TRAITEMENT", label: "En traitement", icon: Clock },
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
