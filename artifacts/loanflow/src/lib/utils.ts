import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr))
}

export const statusMap: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: "Étude du dossier", color: "bg-amber-50 text-amber-800 border-amber-200" },
  ACCEPTE: { label: "Accord de principe", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REFUSE: { label: "Demande refusée", color: "bg-rose-50 text-rose-700 border-rose-200" },
  CONTRAT_ENVOYE: { label: "Contrat reçu", color: "bg-sky-50 text-sky-700 border-sky-200" },
  CONTRAT_SIGNE: { label: "Contrat signé", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  EN_TRAITEMENT: { label: "Validation finale (72h)", color: "bg-amber-50 text-amber-800 border-amber-200" },
  FONDS_DISPONIBLES: { label: "Fonds disponibles", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function maskIban(iban: string) {
  const clean = iban.replace(/\s+/g, "");
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export function formatIban(iban: string) {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}
