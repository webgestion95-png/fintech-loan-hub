import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWithdrawFunds,
  getGetLoanQueryKey,
  getListMyLoansQueryKey,
  getListMyWithdrawalsQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatIban } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Calendar, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loanId: string;
  availableBalance: number;
  applicantName: string;
}

type Step = "amount" | "beneficiary" | "review" | "success";

export function WithdrawDialog({
  open,
  onOpenChange,
  loanId,
  availableBalance,
  applicantName,
}: WithdrawDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const withdrawFunds = useWithdrawFunds();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INSTANT" | "CLASSIQUE">("INSTANT");
  const [beneficiaryName, setBeneficiaryName] = useState(applicantName);
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [reference, setReference] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount.replace(",", ".")) || 0;
  const fee = type === "INSTANT" ? Math.max(1, Math.round(numericAmount * 0.001 * 100) / 100) : 0;
  const total = numericAmount + fee;

  const reset = () => {
    setStep("amount");
    setAmount("");
    setType("INSTANT");
    setIban("");
    setBic("");
    setReference("");
    setScheduledFor("");
    setError(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const validateAmount = () => {
    setError(null);
    if (!numericAmount || numericAmount <= 0) {
      setError("Saisissez un montant valide.");
      return false;
    }
    if (numericAmount > availableBalance + 0.001) {
      setError(`Le montant dépasse votre solde disponible (${formatCurrency(availableBalance)}).`);
      return false;
    }
    return true;
  };

  const validateBeneficiary = () => {
    setError(null);
    const ibanClean = iban.replace(/\s+/g, "").toUpperCase();
    const bicClean = bic.replace(/\s+/g, "").toUpperCase();
    if (beneficiaryName.trim().length < 2) {
      setError("Nom du bénéficiaire requis.");
      return false;
    }
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(ibanClean)) {
      setError("IBAN invalide. Format attendu : FR76 1234 5678 9012 3456 78.");
      return false;
    }
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bicClean)) {
      setError("BIC invalide. Format attendu : BNPAFRPPXXX.");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    setError(null);
    withdrawFunds.mutate(
      {
        id: loanId,
        data: {
          amount: numericAmount,
          type,
          beneficiaryName: beneficiaryName.trim(),
          iban: iban.replace(/\s+/g, "").toUpperCase(),
          bic: bic.replace(/\s+/g, "").toUpperCase(),
          reference: reference.trim() || null,
          scheduledFor: type === "CLASSIQUE" && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(loanId) });
          queryClient.invalidateQueries({ queryKey: getListMyLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMyWithdrawalsQueryKey() });
          setStep("success");
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Échec du virement.";
          setError(msg);
          toast({ title: "Erreur", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        {step !== "success" && (
          <DialogHeader>
            <DialogTitle className="text-xl">Retirer mes fonds</DialogTitle>
            <DialogDescription>
              Solde disponible : <span className="font-semibold text-foreground">{formatCurrency(availableBalance)}</span>
            </DialogDescription>
            {/* Step indicator */}
            <div className="flex items-center gap-2 pt-2">
              {(["amount", "beneficiary", "review"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      ["amount", "beneficiary", "review"].indexOf(step) >= i
                        ? "bg-accent"
                        : "bg-muted",
                    )}
                  />
                </div>
              ))}
            </div>
          </DialogHeader>
        )}

        {step === "amount" && (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label htmlFor="wd-amount">Montant à retirer (€)</Label>
              <div className="relative">
                <Input
                  id="wd-amount"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-20 text-lg font-semibold h-12"
                  data-testid="input-withdraw-amount"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
                  onClick={() => setAmount(availableBalance.toString())}
                  data-testid="button-withdraw-max"
                >
                  Max
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mode de virement</Label>
              <Tabs value={type} onValueChange={(v) => setType(v as "INSTANT" | "CLASSIQUE")}>
                <TabsList className="grid grid-cols-2 w-full h-auto p-1">
                  <TabsTrigger value="INSTANT" className="py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                    <Zap className="h-4 w-4 mr-2" />
                    Instantané
                  </TabsTrigger>
                  <TabsTrigger value="CLASSIQUE" className="py-2.5">
                    <Clock className="h-4 w-4 mr-2" />
                    Classique
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="INSTANT" className="mt-3">
                  <div className="rounded-xl border bg-accent/5 p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> Virement SEPA Instant</span>
                      <span className="text-muted-foreground">Frais 0,1 % (min 1 €)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Réception en moins de 10 secondes, 24h/24, 7j/7.</p>
                  </div>
                </TabsContent>
                <TabsContent value="CLASSIQUE" className="mt-3">
                  <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> Virement SEPA standard</span>
                      <span className="text-success font-medium">Gratuit</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Réception en 1 à 3 jours ouvrés.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="wd-scheduled" className="text-xs">Programmer pour (optionnel)</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="wd-scheduled"
                          type="date"
                          value={scheduledFor}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setScheduledFor(e.target.value)}
                          className="pl-9"
                          data-testid="input-withdraw-scheduled"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "beneficiary" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="wd-name">Nom du bénéficiaire</Label>
              <Input
                id="wd-name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Ex: Jean Dupont"
                data-testid="input-beneficiary-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-iban">IBAN</Label>
              <Input
                id="wd-iban"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                placeholder="FR76 1234 5678 9012 3456 78"
                className="font-mono tracking-wide"
                maxLength={34}
                data-testid="input-iban"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-bic">BIC / SWIFT</Label>
              <Input
                id="wd-bic"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="BNPAFRPPXXX"
                className="font-mono tracking-wide"
                maxLength={11}
                data-testid="input-bic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wd-ref">Référence (optionnel)</Label>
              <Input
                id="wd-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Loyer avril"
                maxLength={140}
                data-testid="input-reference"
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6">
              <div className="text-xs uppercase tracking-wider opacity-80">Vous allez transférer</div>
              <div className="text-4xl font-bold mt-1 font-serif">{formatCurrency(numericAmount)}</div>
              <div className="text-sm opacity-80 mt-1">vers {beneficiaryName}</div>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-medium flex items-center gap-1.5">
                  {type === "INSTANT" ? <><Zap className="h-3.5 w-3.5 text-accent" /> Instantané</> : <><Clock className="h-3.5 w-3.5" /> Classique</>}
                </dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">IBAN</dt>
                <dd className="font-mono text-xs">{formatIban(iban)}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-muted-foreground">BIC</dt>
                <dd className="font-mono text-xs">{bic.toUpperCase()}</dd>
              </div>
              {reference && (
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-muted-foreground">Référence</dt>
                  <dd>{reference}</dd>
                </div>
              )}
              {type === "CLASSIQUE" && scheduledFor && (
                <div className="flex justify-between border-b pb-2">
                  <dt className="text-muted-foreground">Date programmée</dt>
                  <dd className="font-medium">{new Date(scheduledFor).toLocaleDateString("fr-FR")}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Frais</dt>
                <dd className={fee > 0 ? "font-medium" : "text-success font-medium"}>
                  {fee > 0 ? formatCurrency(fee) : "Gratuit"}
                </dd>
              </div>
              <div className="flex justify-between text-base pt-2 border-t">
                <dt className="font-semibold">Total débité</dt>
                <dd className="font-bold">{formatCurrency(total)}</dd>
              </div>
            </dl>

            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <div>
              <DialogTitle className="text-xl">Virement enregistré</DialogTitle>
              <p className="text-muted-foreground mt-2 max-w-sm">
                {type === "INSTANT"
                  ? `${formatCurrency(numericAmount)} arriveront sur le compte de ${beneficiaryName} en moins de 10 secondes.`
                  : scheduledFor
                  ? `${formatCurrency(numericAmount)} seront virés vers ${beneficiaryName} le ${new Date(scheduledFor).toLocaleDateString("fr-FR")}.`
                  : `${formatCurrency(numericAmount)} arriveront sur le compte de ${beneficiaryName} sous 1 à 3 jours ouvrés.`}
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="mt-2 min-w-[140px]" data-testid="button-close-success">
              Terminer
            </Button>
          </div>
        )}

        {step !== "success" && (
          <DialogFooter className="gap-2 sm:gap-2">
            {step === "amount" && (
              <>
                <Button variant="outline" onClick={() => handleClose(false)} className="flex-1 sm:flex-none" data-testid="button-withdraw-cancel">
                  Annuler
                </Button>
                <Button
                  onClick={() => validateAmount() && setStep("beneficiary")}
                  disabled={!numericAmount}
                  className="flex-1 sm:flex-none bg-accent hover:bg-accent/90"
                  data-testid="button-withdraw-next"
                >
                  Continuer <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {step === "beneficiary" && (
              <>
                <Button variant="outline" onClick={() => setStep("amount")} className="flex-1 sm:flex-none">
                  Retour
                </Button>
                <Button
                  onClick={() => validateBeneficiary() && setStep("review")}
                  className="flex-1 sm:flex-none bg-accent hover:bg-accent/90"
                  data-testid="button-beneficiary-next"
                >
                  Continuer <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" onClick={() => setStep("beneficiary")} className="flex-1 sm:flex-none">
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={withdrawFunds.isPending}
                  className="flex-1 sm:flex-none bg-success hover:bg-success/90 text-success-foreground"
                  data-testid="button-confirm-withdraw"
                >
                  {withdrawFunds.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirmer le virement
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
