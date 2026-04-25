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
  EN_ATTENTE: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  ACCEPTE: { label: "Acceptée", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REFUSE: { label: "Refusée", color: "bg-red-100 text-red-800 border-red-200" },
  CONTRAT_ENVOYE: { label: "Contrat envoyé", color: "bg-blue-100 text-blue-800 border-blue-200" },
  CONTRAT_SIGNE: { label: "Contrat signé", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  EN_TRAITEMENT: { label: "En traitement (72h)", color: "bg-purple-100 text-purple-800 border-purple-200" },
  FONDS_DISPONIBLES: { label: "Fonds disponibles", color: "bg-green-100 text-green-800 border-green-200" },
};
