import { useParams, Link } from "wouter";
import {
  useGetLoan,
  useUploadSignedContract,
  getGetLoanQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  cn,
  formatIban,
} from "@/lib/utils";
import {
  LOAN_STEPS,
  LOAN_STATUS,
  WITHDRAWAL_STATUS,
  TONE_CLASSES,
  getStepState,
  type LoanStatus,
} from "@/lib/status";
import {
  FileText,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
  Send,
  Wallet,
  ArrowLeft,
  CheckCircle2,
  Check,
  History,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { WithdrawDialog } from "@/components/WithdrawDialog";

export function LoanDetail() {
  const { id } = useParams();
  const { data: loan, isLoading } = useGetLoan(id || "");
  const uploadContract = useUploadSignedContract();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (isLoading || !loan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const status = loan.status as LoanStatus;
  const isRefused = status === "REFUSE";
  const meta = LOAN_STATUS[status];

  const handleUploadContract = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !id) return;

    const file = files[0]!;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result?.toString().split(",")[1];
      if (base64String) {
        uploadContract.mutate(
          {
            id,
            data: {
              filename: file.name,
              contentType: file.type,
              dataBase64: base64String,
            },
          },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) });
              toast({
                title: "Contrat envoyé",
                description: "Votre contrat signé a été reçu.",
              });
            },
            onError: () => {
              toast({
                title: "Erreur",
                description: "Échec de l'envoi.",
                variant: "destructive",
              });
            },
            onSettled: () => setIsUploading(false),
          },
        );
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Back link */}
      <Link href="/loans" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Retour à mes prêts
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Dossier #{loan.id.slice(0, 8).toUpperCase()}</p>
          <h1 className="text-3xl font-serif tracking-tight mt-0.5">Détail du prêt</h1>
        </div>
        {!isRefused && meta && (
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm shrink-0",
            TONE_CLASSES[meta.tone].bg,
            TONE_CLASSES[meta.tone].text,
            TONE_CLASSES[meta.tone].border,
          )}>
            <meta.icon className={cn("h-4 w-4", status === "EN_TRAITEMENT" && "animate-spin")} />
            {meta.label}
          </div>
        )}
      </div>

      {/* Stepper */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {isRefused ? (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <div className="h-16 w-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-rose-900 mb-2">Demande refusée</h3>
              <p className="text-muted-foreground max-w-md">
                Après étude de votre dossier, nous ne pouvons malheureusement pas donner une suite favorable à votre demande de financement.
              </p>
              {loan.adminNote && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-900 text-left w-full max-w-md">
                  <strong>Motif :</strong> {loan.adminNote}
                </div>
              )}
            </div>
          ) : (
            <Stepper currentStatus={status} />
          )}
          {!isRefused && meta && (
            <p className="text-center text-sm text-muted-foreground mt-6">{meta.description}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé de la demande</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <SummaryItem label="Montant" value={formatCurrency(loan.amount)} highlight />
                <SummaryItem label="Durée" value={`${loan.durationMonths} mois`} highlight />
                <SummaryItem label="Mensualité estimée" value={formatCurrency(loan.amount / loan.durationMonths)} />
                <SummaryItem label="Revenus mensuels" value={formatCurrency(loan.monthlyIncome)} />
                {loan.purpose && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Motif</dt>
                    <dd className="text-sm mt-1">{loan.purpose}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {loan.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents fournis</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {loan.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-3 p-3 border rounded-xl hover-elevate"
                    >
                      <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          Ajouté le {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Withdrawals history */}
          {loan.withdrawals && loan.withdrawals.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-4 w-4" /> Historique des virements
                </CardTitle>
                <span className="text-xs text-muted-foreground">{loan.withdrawals.length} opération(s)</span>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {loan.withdrawals.map((w) => {
                    const wmeta = WITHDRAWAL_STATUS[w.status] ?? WITHDRAWAL_STATUS.EN_COURS!;
                    const Icon = wmeta.icon;
                    const tone = TONE_CLASSES[wmeta.tone];
                    return (
                      <li key={w.id} className="px-5 py-4 flex items-start gap-4">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", tone.bg)}>
                          <Icon className={cn("h-4 w-4", tone.text, w.status === "EN_COURS" && "animate-spin")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-semibold truncate">{w.beneficiaryName}</p>
                            <span className="text-base font-bold tabular-nums shrink-0">
                              -{formatCurrency(w.amount)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                            {formatIban(w.iban)} · {w.bic}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", tone.bg, tone.text)}>
                              {wmeta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {w.type === "INSTANT" ? "Instantané" : "Classique"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · {formatDateTime(w.createdAt)}
                            </span>
                            {w.fee > 0 && (
                              <span className="text-xs text-muted-foreground">
                                · Frais {formatCurrency(w.fee)}
                              </span>
                            )}
                            {w.scheduledFor && (
                              <span className="text-xs text-muted-foreground">
                                · Programmé pour le {formatDate(w.scheduledFor)}
                              </span>
                            )}
                          </div>
                          {w.reference && (
                            <p className="text-xs text-muted-foreground mt-1 italic">« {w.reference} »</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Wallet card if funds available */}
          {status === "FONDS_DISPONIBLES" && (
            <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-success to-emerald-700 text-white relative">
              <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wider">
                  <Wallet className="h-4 w-4" /> Solde disponible
                </div>
                <div className="text-3xl md:text-4xl font-serif font-medium mt-1.5 tabular-nums" data-testid="text-loan-balance">
                  {formatCurrency(loan.availableBalance)}
                </div>
                {loan.withdrawnAmount > 0 && (
                  <p className="text-xs text-white/70 mt-1">
                    Déjà retiré : {formatCurrency(loan.withdrawnAmount)} sur {formatCurrency(loan.amount)}
                  </p>
                )}
                <Button
                  onClick={() => setWithdrawOpen(true)}
                  disabled={loan.availableBalance <= 0}
                  className="w-full mt-5 bg-white text-success hover:bg-white/95 font-semibold shadow-md"
                  size="lg"
                  data-testid="button-open-withdraw"
                >
                  <Send className="mr-2 h-4 w-4" /> Effectuer un virement
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contract card */}
          {(status === "CONTRAT_ENVOYE" ||
            status === "CONTRAT_SIGNE" ||
            status === "EN_TRAITEMENT" ||
            status === "FONDS_DISPONIBLES") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" /> Contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loan.generatedContract && (
                  <Button variant="outline" className="w-full justify-between" asChild>
                    <a
                      href={`${import.meta.env.BASE_URL}api/loans/${loan.id}/contract.pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Télécharger le contrat
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}

                {status === "CONTRAT_ENVOYE" && (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm">
                      Veuillez signer le contrat puis l'envoyer ci-dessous pour validation.
                    </p>
                    <input
                      type="file"
                      id="signedContract"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleUploadContract}
                      disabled={isUploading || uploadContract.isPending}
                    />
                    <Button
                      asChild
                      className="w-full"
                      disabled={isUploading || uploadContract.isPending}
                    >
                      <label htmlFor="signedContract" className="cursor-pointer">
                        {isUploading || uploadContract.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Envoyer le contrat signé
                      </label>
                    </Button>
                  </div>
                )}

                {loan.signedContract && (
                  <div className="flex items-center gap-2 text-sm text-success bg-success/5 p-3 rounded-lg border border-success/20">
                    <CheckCircle2 className="h-4 w-4" /> Contrat signé reçu
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des actions</CardTitle>
            </CardHeader>
            <CardContent>
              {loan.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune action encore.</p>
              ) : (
                <ol className="relative space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {loan.timeline.map((event) => (
                    <li key={event.id} className="relative pl-9">
                      <span className="absolute left-0 top-1 h-6 w-6 rounded-full bg-accent/10 border-2 border-background ring-2 ring-accent/30 flex items-center justify-center">
                        <Check className="h-3 w-3 text-accent" />
                      </span>
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(event.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        loanId={loan.id}
        availableBalance={loan.availableBalance}
        applicantName={loan.applicantName}
      />
    </div>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</dt>
      <dd className={cn("mt-1 tabular-nums", highlight ? "text-2xl font-serif font-medium" : "text-base font-medium")}>
        {value}
      </dd>
    </div>
  );
}

function Stepper({ currentStatus }: { currentStatus: LoanStatus }) {
  return (
    <div className="relative">
      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-5 left-5 right-5 h-1 bg-muted rounded-full" />
          {/* Active line */}
          <div
            className="absolute top-5 left-5 h-1 bg-gradient-to-r from-accent to-success rounded-full transition-all duration-700"
            style={{
              width: `calc(${(LOAN_STEPS.findIndex((s) => s.id === currentStatus) / (LOAN_STEPS.length - 1)) * 100}% - ${(LOAN_STEPS.findIndex((s) => s.id === currentStatus) / (LOAN_STEPS.length - 1)) * 40}px)`,
            }}
          />
          <ol className="relative grid grid-cols-6 gap-2">
            {LOAN_STEPS.map((step) => {
              const state = getStepState(currentStatus, step.id);
              return (
                <li key={step.id} className="flex flex-col items-center text-center">
                  <StepperBubble state={state} icon={step.icon} />
                  <span
                    className={cn(
                      "mt-3 text-xs font-medium leading-tight px-1",
                      state === "done" && "text-foreground",
                      state === "current" && "text-foreground font-semibold",
                      state === "pending" && "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Mobile vertical layout */}
      <ol className="md:hidden relative space-y-4 before:absolute before:left-5 before:top-5 before:bottom-5 before:w-0.5 before:bg-muted">
        {LOAN_STEPS.map((step) => {
          const state = getStepState(currentStatus, step.id);
          return (
            <li key={step.id} className="relative flex items-center gap-4">
              <StepperBubble state={state} icon={step.icon} />
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "done" && "text-foreground",
                  state === "current" && "text-foreground font-semibold",
                  state === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StepperBubble({
  state,
  icon: Icon,
}: {
  state: "done" | "current" | "pending";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 border-2",
        state === "done" && "bg-success text-white border-success shadow-md shadow-success/30",
        state === "current" && "bg-amber-50 text-amber-600 border-amber-500 ring-4 ring-amber-100 shadow-md shadow-amber-200",
        state === "pending" && "bg-white text-muted-foreground border-muted",
      )}
    >
      {state === "done" ? (
        <Check className="h-5 w-5" strokeWidth={3} />
      ) : state === "current" ? (
        <Icon className="h-5 w-5 animate-pulse" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      {state === "current" && (
        <span className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping opacity-40" />
      )}
    </span>
  );
}
