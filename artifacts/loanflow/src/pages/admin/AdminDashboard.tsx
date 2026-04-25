import { Link } from "wouter";
import { useAdminGetStats, useAdminGetActivity, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, FileText, CheckCircle, Clock, XCircle, TrendingUp, Activity } from "lucide-react";
import { Redirect } from "wouter";

export function AdminDashboard() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: stats, isLoading: isStatsLoading } = useAdminGetStats();
  const { data: activities, isLoading: isActivityLoading } = useAdminGetActivity();

  if (isUserLoading) return <div className="p-8"><Skeleton className="h-8 w-32 mb-4" /><Skeleton className="h-64" /></div>;
  if (user?.role !== "ADMIN") return <Redirect to="/403" />;

  const kpis = stats ? [
    { title: "Total des demandes", value: stats.totalLoans, icon: FileText, color: "text-blue-600" },
    { title: "En attente", value: stats.pending, icon: Clock, color: "text-yellow-600" },
    { title: "Acceptées", value: stats.accepted, icon: CheckCircle, color: "text-emerald-600" },
    { title: "Refusées", value: stats.refused, icon: XCircle, color: "text-red-600" },
  ] : Array(4).fill(null);

  const amounts = stats ? [
    { title: "Montant total demandé", value: formatCurrency(stats.totalAmountRequested) },
    { title: "Montant total accepté", value: formatCurrency(stats.totalAmountAccepted) },
    { title: "Fonds débloqués", value: formatCurrency(stats.totalDisbursed) },
  ] : Array(3).fill(null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Tableau de bord Admin</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble de l'activité LoanFlow.</p>
        </div>
        <Button asChild>
          <Link href="/admin/loans">
            Voir tous les dossiers
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => (
          <Card key={i} className={!kpi ? "" : `border-t-4 hover-elevate transition-all cursor-pointer`} onClick={() => kpi && window.location.assign(`/admin/loans?status=${kpi.title === "En attente" ? "EN_ATTENTE" : ""}`)} style={{ borderTopColor: kpi ? "currentColor" : "transparent" }}>
            <CardContent className="p-6">
              {isStatsLoading || !kpi ? (
                <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-12" /></div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold">{kpi.value}</p>
                  </div>
                  <kpi.icon className={`h-8 w-8 opacity-20 ${kpi.color}`} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Volumes financiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                {amounts.map((amt, i) => (
                  <div key={i} className="p-4 bg-muted/20 rounded-xl border">
                    {isStatsLoading || !amt ? (
                      <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-32" /></div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-muted-foreground mb-2">{amt.title}</p>
                        <p className="text-xl font-bold text-foreground">{amt.value}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activité récente
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/loans">Tout voir</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isActivityLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : activities?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune activité récente.</p>
              ) : (
                <div className="space-y-4">
                  {activities?.slice(0, 10).map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{act.message}</p>
                          <p className="text-xs text-muted-foreground">{act.applicantName} • Dossier n°{act.loanId.slice(0,8)}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{formatDateTime(act.createdAt)}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1" asChild>
                          <Link href={`/admin/loans/${act.loanId}`}>Ouvrir</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="font-serif text-xl mb-2">Actions rapides</h3>
              <p className="text-sm opacity-80 mb-6">Gérez les dossiers en attente en priorité pour maintenir notre engagement de réponse en 24h.</p>
              <div className="space-y-3">
                <Button variant="secondary" className="w-full justify-between" asChild>
                  <Link href="/admin/loans?status=EN_ATTENTE">
                    Dossiers à étudier
                    <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{stats?.pending || 0}</Badge>
                  </Link>
                </Button>
                <Button variant="secondary" className="w-full justify-between" asChild>
                  <Link href="/admin/loans?status=CONTRAT_SIGNE">
                    Contrats signés à traiter
                    <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">{stats?.contractSigned || 0}</Badge>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
