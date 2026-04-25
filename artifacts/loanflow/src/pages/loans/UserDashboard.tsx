import { useListMyLoans } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, statusMap } from "@/lib/utils";
import { PlusCircle, FileText, ArrowRight, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function UserDashboard() {
  const { data: loans, isLoading } = useListMyLoans();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Mes prêts</h1>
          <p className="text-muted-foreground mt-1">Suivez l'avancement de vos demandes de financement.</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/loans/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : loans?.length === 0 ? (
        <Card className="bg-white/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Vous n'avez pas encore demandé de prêt</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Financez vos projets (auto, travaux, trésorerie) avec un prêt personnel adapté à votre situation.
            </p>
            <Button asChild>
              <Link href="/loans/new">Commencer ma simulation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {loans?.map((loan) => (
            <Card key={loan.id} className="hover-elevate overflow-hidden flex flex-col">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{formatCurrency(loan.amount)}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      sur {loan.durationMonths} mois • {(loan.amount / loan.durationMonths).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / mois
                    </p>
                  </div>
                  <Badge variant="outline" className={statusMap[loan.status]?.color || ""}>
                    {statusMap[loan.status]?.label || loan.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <span className="font-medium mr-2">Motif:</span> {loan.purpose || "Non spécifié"}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span className="font-medium mr-2">Demande le:</span> {formatDate(loan.createdAt)}
                </div>
                
                {loan.status === "FONDS_DISPONIBLES" && loan.availableBalance > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-800">
                    <div className="flex items-center gap-2 font-medium">
                      <Wallet className="h-4 w-4" />
                      Solde disponible
                    </div>
                    <span className="font-bold">{formatCurrency(loan.availableBalance)}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 pb-4 px-6 mt-auto">
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link href={`/loans/${loan.id}`}>
                    Voir les détails
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
