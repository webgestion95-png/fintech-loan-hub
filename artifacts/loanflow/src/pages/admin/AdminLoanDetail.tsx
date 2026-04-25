import { useState } from "react";
import { useParams, Redirect } from "wouter";
import { 
  useAdminGetLoan, 
  useAdminDecideLoan, 
  useAdminAdvanceStatus, 
  useGetMe,
  getAdminGetLoanQueryKey,
  getAdminGetStatsQueryKey,
  getAdminGetActivityQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate, formatDateTime, statusMap } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Check, X, ArrowRight, Loader2, Clock, PlayCircle, Unlock, CheckCircle } from "lucide-react";

export function AdminLoanDetail() {
  const { id } = useParams();
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: loan, isLoading } = useAdminGetLoan(id || "");
  
  const decideLoan = useAdminDecideLoan();
  const advanceStatus = useAdminAdvanceStatus();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isRefuseModalOpen, setIsRefuseModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  if (isUserLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (user?.role !== "ADMIN") return <Redirect to="/403" />;
  
  if (isLoading || !loan) {
    return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64" /></div>;
  }

  const handleAction = async (actionFn: any, payload: any, successMessage: string) => {
    actionFn.mutate({ id: loan.id, data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetLoanQueryKey(loan.id) });
        queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminGetActivityQueryKey() });
        toast({ title: "Succès", description: successMessage });
        setIsRefuseModalOpen(false);
        setAdminNote("");
      },
      onError: (err: any) => {
        toast({ title: "Erreur", description: err?.response?.data?.error || "Une erreur est survenue", variant: "destructive" });
      }
    });
  };

  const handleAccept = () => handleAction(decideLoan, { decision: "ACCEPT" }, "Dossier accepté avec succès.");
  const handleRefuse = () => handleAction(decideLoan, { decision: "REFUSE", adminNote }, "Dossier refusé.");
  
  const handleSendContract = () => handleAction(advanceStatus, { action: "SEND_CONTRACT" }, "Contrat généré et envoyé.");
  const handleStartProcessing = () => handleAction(advanceStatus, { action: "START_PROCESSING" }, "Traitement de 72h démarré.");
  const handleReleaseFunds = () => handleAction(advanceStatus, { action: "RELEASE_FUNDS" }, "Fonds débloqués dans le portefeuille client.");

  const isActionLoading = decideLoan.isPending || advanceStatus.isPending;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Dossier n°{loan.id.slice(0,8)}</h1>
          <p className="text-muted-foreground mt-1">Demandeur : {loan.applicantName}</p>
        </div>
        <Badge variant="outline" className={`text-base py-1 px-3 ${statusMap[loan.status]?.color || ""}`}>
          {statusMap[loan.status]?.label || loan.status}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations Financières</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Montant demandé</dt>
                  <dd className="text-2xl font-bold mt-1 text-primary">{formatCurrency(loan.amount)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Revenus mensuels déclarés</dt>
                  <dd className="text-2xl font-bold mt-1">{formatCurrency(loan.monthlyIncome)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Durée</dt>
                  <dd className="text-lg font-medium mt-1">{loan.durationMonths} mois</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Mensualité estimée (hors assurance)</dt>
                  <dd className="text-lg font-medium mt-1">{formatCurrency(loan.amount / loan.durationMonths)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Taux d'endettement estimé</dt>
                  <dd className="text-lg font-medium mt-1 text-orange-600">
                    {Math.round(((loan.amount / loan.durationMonths) / loan.monthlyIncome) * 100)}%
                  </dd>
                </div>
                {loan.purpose && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Motif du prêt</dt>
                    <dd className="mt-1 bg-muted/20 p-3 rounded text-sm">{loan.purpose}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identité & Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Nom</dt>
                  <dd className="mt-1">{loan.applicantName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                  <dd className="mt-1">{loan.applicantEmail}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Utilisateur (Compte)</dt>
                  <dd className="mt-1 font-mono text-xs">{loan.userEmail}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Date de la demande</dt>
                  <dd className="mt-1">{formatDateTime(loan.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pièces justificatives</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {loan.documents.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{doc.filename}</p>
                        <p className="text-xs text-muted-foreground">{doc.contentType} • {formatDate(doc.uploadedAt)}</p>
                      </div>
                    </div>
                    {/* In a real app, we'd have a download endpoint for raw documents too */}
                    <Badge variant="secondary">Reçu</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg">Actions Requises</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {loan.status === "EN_ATTENTE" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Étudiez le dossier et prenez une décision.</p>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleAccept} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Accepter le dossier
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => setIsRefuseModalOpen(true)} disabled={isActionLoading}>
                    <X className="mr-2 h-4 w-4" />
                    Refuser
                  </Button>
                </div>
              )}

              {loan.status === "ACCEPTE" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 mb-4 text-sm">
                    Dossier accepté. Vous devez maintenant générer et envoyer le contrat au client.
                  </div>
                  <Button className="w-full" onClick={handleSendContract} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Générer et envoyer contrat
                  </Button>
                </div>
              )}

              {loan.status === "CONTRAT_ENVOYE" && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 text-blue-800 rounded border border-blue-100 text-sm flex items-start gap-2">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>En attente de la signature du client. Aucune action possible pour le moment.</span>
                  </div>
                </div>
              )}

              {loan.status === "CONTRAT_SIGNE" && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 text-indigo-800 rounded border border-indigo-100 mb-4 text-sm">
                    Contrat signé reçu. Lancez la période légale de rétractation de 72h.
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleStartProcessing} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Lancer le traitement (72h)
                  </Button>
                </div>
              )}

              {loan.status === "EN_TRAITEMENT" && (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 text-purple-800 rounded border border-purple-100 mb-4 text-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="h-4 w-4" />
                      Délai légal en cours
                    </div>
                    <span>Fin prévue : {loan.processingUntil ? formatDateTime(loan.processingUntil) : "N/A"}</span>
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleReleaseFunds} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlock className="mr-2 h-4 w-4" />}
                    Débloquer les fonds (Forcer)
                  </Button>
                </div>
              )}

              {loan.status === "FONDS_DISPONIBLES" && (
                <div className="p-3 bg-green-50 text-green-800 rounded border border-green-100 text-sm flex flex-col gap-2 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <span className="font-bold">Dossier clôturé</span>
                  <span>Fonds mis à disposition du client.</span>
                  <div className="mt-2 text-xs opacity-70">Reste à retirer : {formatCurrency(loan.availableBalance)}</div>
                </div>
              )}

              {loan.status === "REFUSE" && (
                <div className="p-3 bg-red-50 text-red-800 rounded border border-red-100 text-sm flex flex-col gap-2">
                  <X className="h-6 w-6 text-red-600 mb-1" />
                  <span className="font-bold">Dossier refusé</span>
                  {loan.adminNote && <span>Motif : {loan.adminNote}</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {loan.generatedContract && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Documents légaux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-sm h-10" asChild>
                  <a href={`${import.meta.env.BASE_URL}api/loans/${loan.id}/contract.pdf`} target="_blank" rel="noreferrer">
                    <Download className="mr-2 h-4 w-4" /> Contrat généré
                  </a>
                </Button>
                
                {loan.signedContract && (
                   <Button variant="secondary" className="w-full justify-start text-sm h-10 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200" disabled>
                     <CheckCircle className="mr-2 h-4 w-4" /> Contrat signé (Reçu)
                   </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isRefuseModalOpen} onOpenChange={setIsRefuseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le dossier</DialogTitle>
            <DialogDescription>
              Veuillez indiquer le motif du refus. Cette information sera visible par le client.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Ex: Taux d'endettement trop élevé, pièces non conformes..." 
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefuseModalOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={isActionLoading || !adminNote.trim()}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
