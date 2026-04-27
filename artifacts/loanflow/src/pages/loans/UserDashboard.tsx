import { useListMyLoans, useListMyWithdrawals, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { LOAN_STATUS, WITHDRAWAL_STATUS, TONE_CLASSES, type LoanStatus } from "@/lib/status";
import {
  PlusCircle,
  ArrowRight,
  Wallet,
  TrendingUp,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export function UserDashboard() {
  const { data: loans, isLoading: loansLoading } = useListMyLoans();
  const { data: withdrawals } = useListMyWithdrawals();
  const { data: me } = useGetMe();

  const [hideBalance, setHideBalance] = useState(false);

  const totalAvailable = loans?.reduce((sum, l) => sum + (l.availableBalance || 0), 0) ?? 0;
  const totalRequested = loans?.reduce((sum, l) => sum + l.amount, 0) ?? 0;
  const totalWithdrawn = loans?.reduce((sum, l) => sum + (l.withdrawnAmount || 0), 0) ?? 0;
  const activeLoanCount = loans?.filter((l) => l.status !== "REFUSE").length ?? 0;

  const recentWithdrawals = withdrawals?.slice(0, 5) ?? [];

  const firstName = me?.fullName?.split(" ")[0] || "";

  if (loansLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasLoans = (loans?.length ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Bienvenue{firstName ? `, ${firstName}` : ""}</p>
          <h1 className="text-3xl font-serif tracking-tight text-foreground mt-0.5">Mon tableau de bord</h1>
        </div>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20" data-testid="button-new-loan">
          <Link href="/loans/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {/* Wallet Hero */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary via-[#0a2547] to-[#061533] text-white relative">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-success/20 blur-3xl"
        />
        <CardContent className="p-8 md:p-10 relative">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
              <Wallet className="h-4 w-4" />
              Solde total disponible
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover-elevate"
              aria-label={hideBalance ? "Afficher le solde" : "Masquer le solde"}
              data-testid="button-toggle-balance"
            >
              {hideBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="text-5xl md:text-6xl font-serif font-medium tracking-tight tabular-nums" data-testid="text-total-balance">
            {hideBalance ? "•••••• €" : formatCurrency(totalAvailable)}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-white/70 text-sm">
            <span>sur {formatCurrency(totalRequested)} financés</span>
            {totalWithdrawn > 0 && (
              <>
                <span className="opacity-30">•</span>
                <span>{formatCurrency(totalWithdrawn)} retirés</span>
              </>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {totalAvailable > 0 && loans && (
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-md font-semibold"
                data-testid="button-quick-withdraw"
              >
                <Link href={`/loans/${loans.find((l) => l.availableBalance > 0)?.id}`}>
                  <Send className="mr-2 h-4 w-4" />
                  Effectuer un virement
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10 border border-white/20"
            >
              <Link href="/loans/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau prêt
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Prêts actifs"
          value={activeLoanCount.toString()}
          tone="info"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total financé"
          value={formatCurrency(totalRequested)}
          tone="primary"
        />
        <StatCard
          icon={<ArrowUpRight className="h-5 w-5" />}
          label="Retraits effectués"
          value={withdrawals?.length.toString() ?? "0"}
          tone="success"
        />
      </div>

      {/* Loans + Activity grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Loans list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-medium">Mes prêts</h2>
            {hasLoans && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/loans/new">
                  + Nouveau
                </Link>
              </Button>
            )}
          </div>

          {!hasLoans ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-1.5">Commencez votre première demande</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  Financez vos projets en quelques minutes : auto, travaux, trésorerie ou tout autre besoin.
                </p>
                <Button asChild>
                  <Link href="/loans/new">Faire une simulation</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {loans?.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-medium">Activité récente</h2>
          <Card>
            <CardContent className="p-0">
              {recentWithdrawals.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Wallet className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Aucun virement pour le moment
                </div>
              ) : (
                <ul className="divide-y">
                  {recentWithdrawals.map((w) => {
                    const meta = WITHDRAWAL_STATUS[w.status] ?? WITHDRAWAL_STATUS.EN_COURS!;
                    const Icon = meta.icon;
                    const tone = TONE_CLASSES[meta.tone];
                    return (
                      <li key={w.id} className="p-4 flex items-start gap-3 hover-elevate">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", tone.bg)}>
                          <Icon className={cn("h-4 w-4", tone.text, w.status === "EN_COURS" && "animate-spin")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium truncate">{w.beneficiaryName}</p>
                            <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(w.amount)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", tone.bg, tone.text)}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(w.createdAt)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "info" | "success" | "warning" | "primary";
}) {
  const t = TONE_CLASSES[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", t.bg, t.text)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold mt-0.5 tabular-nums truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoanCard({ loan }: { loan: { id: string; amount: number; durationMonths: number; status: string; createdAt: string; availableBalance: number; purpose: string | null } }) {
  const meta = LOAN_STATUS[loan.status as LoanStatus];
  const Icon = meta?.icon ?? CheckCircle2;
  const tone = TONE_CLASSES[meta?.tone ?? "neutral"];

  return (
    <Link href={`/loans/${loan.id}`}>
      <Card className="hover-elevate cursor-pointer transition-shadow hover:shadow-md" data-testid={`card-loan-${loan.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", tone.bg)}>
              <Icon className={cn("h-5 w-5", tone.text, loan.status === "EN_TRAITEMENT" && "animate-spin")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold tabular-nums">{formatCurrency(loan.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {loan.durationMonths} mois · Demandé le {formatDate(loan.createdAt)}
                  </div>
                </div>
                <span className={cn("text-xs font-semibold px-2 py-1 rounded-full border whitespace-nowrap", tone.bg, tone.text, tone.border)}>
                  {meta?.label}
                </span>
              </div>
              {loan.purpose && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{loan.purpose}</p>
              )}
              {loan.availableBalance > 0 && (
                <div className="mt-3 flex items-center justify-between bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-success flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> Solde disponible
                  </span>
                  <span className="text-sm font-bold text-success tabular-nums">{formatCurrency(loan.availableBalance)}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-end text-xs text-accent font-medium">
                Voir le détail <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
