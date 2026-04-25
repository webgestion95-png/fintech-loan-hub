import { useParams } from "wouter";
import { useGetLoan, useUploadSignedContract, useWithdrawFunds, getGetLoanQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate, formatDateTime, statusMap } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Upload, CheckCircle, Wallet, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: "EN_ATTENTE", label: "En attente" },
  { id: "ACCEPTE", label: "Acceptée" },
  { id: "CONTRAT_ENVOYE", label: "Contrat envoyé" },
  { id: "CONTRAT_SIGNE", label: "Contrat signé" },
  { id: "EN_TRAITEMENT", label: "En traitement" },
  { id: "FONDS_DISPONIBLES", label: "Fonds disponibles" },
];

export function LoanDetail() {
  const { id } = useParams();
  const { data: loan, isLoading } = useGetLoan(id || "");
  const uploadContract = useUploadSignedContract();
  const withdrawFunds = useWithdrawFunds();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  if (isLoading || !loan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex(s => s.id === loan.status);
  const isRefused = loan.status === "REFUSE";

  const handleUploadContract = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !id) return;

    const file = files[0];
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result?.toString().split(',')[1];
      if (base64String) {
        uploadContract.mutate({
          id,
          data: {
            filename: file.name,
            contentType: file.type,
            dataBase64: base64String
          }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) });
            toast({ title: "Contrat envoyé", description: "Votre contrat signé a été reçu." });
          },
          onError: () => {
            toast({ title: "Erreur", description: "Échec de l'envoi.", variant: "destructive" });
          },
          onSettled: () => setIsUploading(false)
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWithdraw = () => {
    if (!id || !withdrawAmount) return;
    const amount = Number(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > loan.availableBalance) {
      toast({ title: "Erreur", description: "Montant invalide", variant: "destructive" });
      return;
    }

    withdrawFunds.mutate({ id, data: { amount } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }); // Update wallet balance
        setWithdrawAmount("");
        toast({ title: "Retrait effectué", description: "Les fonds sont sur votre compte." });
      },
      onError: () => toast({ title: "Erreur", description: "Échec du retrait.", variant: "destructive" })
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-primary">Détail du prêt</h1>
          <p className="text-muted-foreground mt-1">Dossier n°{loan.id.slice(0,8)}</p>
        </div>
        <Badge variant="outline" className={`text-base py-1 px-3 ${statusMap[loan.status]?.color || ""}`}>
          {statusMap[loan.status]?.label || loan.status}
        </Badge>
      </div>

      {/* Stepper */}
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          {isRefused ? (
            <div className="flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-red-800 mb-2">Demande refusée</h3>
              <p className="text-muted-foreground max-w-md">Après étude de votre dossier, nous ne pouvons malheureusement pas donner une suite favorable à votre demande de financement.</p>
              {loan.adminNote && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-md text-sm text-red-800 text-left w-full max-w-md">
                  <strong>Motif :</strong> {loan.adminNote}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 hidden md:block" />
              <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 hidden md:block transition-all duration-500" 
                   style={{ width: `${Math.max(0, (currentStepIndex / (STEPS.length - 1)) * 100)}%` }} />
              
              <div className="relative flex flex-col md:flex-row justify-between gap-4 md:gap-0">
                {STEPS.map((step, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;
                  
                  return (
                    <div key={step.id} className="flex md:flex-col items-center gap-4 md:gap-3 group">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white z-10 shrink-0
                        ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : 'border-muted text-muted-foreground'}
                        ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                      `}>
                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs font-medium">{idx + 1}</span>}
                      </div>
                      <div className="flex flex-col md:items-center md:text-center">
                        <span className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Résumé de la demande</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Montant</dt>
                  <dd className="text-xl font-bold mt-1">{formatCurrency(loan.amount)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Durée</dt>
                  <dd className="text-xl font-bold mt-1">{loan.durationMonths} mois</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Mensualité estimée</dt>
                  <dd className="text-lg font-medium mt-1">{formatCurrency(loan.amount / loan.durationMonths)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Revenus mensuels</dt>
                  <dd className="text-lg font-medium mt-1">{formatCurrency(loan.monthlyIncome)}</dd>
                </div>
                {loan.purpose && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Motif</dt>
                    <dd className="mt-1">{loan.purpose}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {loan.documents.map(doc => (
                  <li key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">Ajouté le {formatDate(doc.uploadedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Actions depending on status */}
          
          {(currentStepIndex >= STEPS.findIndex(s => s.id === "CONTRAT_ENVOYE")) && !isRefused && (
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contrat
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {loan.generatedContract && (
                  <Button variant="outline" className="w-full justify-between" asChild>
                    <a href={`${import.meta.env.BASE_URL}api/loans/${loan.id}/contract.pdf`} target="_blank" rel="noreferrer">
                      Télécharger le contrat
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}

                {loan.status === "CONTRAT_ENVOYE" && (
                  <div className="pt-4 border-t">
                    <p className="text-sm mb-3">Veuillez signer le contrat et le téléverser ci-dessous pour validation.</p>
                    <div>
                      <input
                        type="file"
                        id="signedContract"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleUploadContract}
                        disabled={isUploading || uploadContract.isPending}
                      />
                      <Button asChild className="w-full" disabled={isUploading || uploadContract.isPending}>
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
                  </div>
                )}

                {loan.signedContract && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200">
                    <CheckCircle className="h-4 w-4" />
                    Contrat signé reçu
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {loan.status === "FONDS_DISPONIBLES" && (
            <Card className="border-green-200 shadow-md bg-green-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <Wallet className="h-5 w-5" />
                  Portefeuille
                </CardTitle>
                <CardDescription>Vos fonds sont prêts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                  <div className="text-sm text-muted-foreground mb-1">Solde disponible</div>
                  <div className="text-3xl font-bold text-green-700">{formatCurrency(loan.availableBalance)}</div>
                </div>

                {loan.availableBalance > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Montant" 
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        max={loan.availableBalance}
                      />
                      <Button 
                        variant="secondary" 
                        className="shrink-0"
                        onClick={() => setWithdrawAmount(loan.availableBalance.toString())}
                      >
                        Max
                      </Button>
                    </div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white" 
                        onClick={handleWithdraw}
                      disabled={withdrawFunds.isPending || !withdrawAmount}
                    >
                      {withdrawFunds.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                      Retirer les fonds
                    </Button>
                  </div>
                )}
                {loan.withdrawnAmount > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Déjà retiré : {formatCurrency(loan.withdrawnAmount)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent hidden md:block" />
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-1.5 before:-translate-x-px before:h-full before:w-px before:bg-border">
                {loan.timeline.map((event, i) => (
                  <div key={event.id} className="relative flex gap-4 text-sm">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-primary/20 ring-2 ring-background shrink-0 z-10" />
                    <div>
                      <p className="font-medium text-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
