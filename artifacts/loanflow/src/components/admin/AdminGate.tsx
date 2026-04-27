import { useState } from "react";
import { Redirect } from "wouter";
import {
  useGetMe,
  useAdminGetTwoFactorStatus,
  useAdminSetupTwoFactor,
  useAdminEnableTwoFactor,
  useAdminVerifyTwoFactor,
  getAdminGetTwoFactorStatusQueryKey,
} from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, KeyRound, Smartphone, Copy, CheckCircle2 } from "lucide-react";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: status, isLoading: isStatusLoading, error } = useAdminGetTwoFactorStatus({
    query: {
      queryKey: getAdminGetTwoFactorStatusQueryKey(),
      enabled: user?.role === "ADMIN",
      refetchInterval: 60_000,
      retry: false,
      placeholderData: keepPreviousData,
    },
  });

  if (isUserLoading) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (user?.role !== "ADMIN") return <Redirect to="/403" />;

  if (isStatusLoading) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error || !status) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>Impossible de vérifier l'état de la 2FA. Réessayez.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status.required && !status.enabled) return <SetupTwoFactor />;
  if (status.required && !status.verified) return <VerifyTwoFactor email={user.email} />;

  return <>{children}</>;
}

function SetupTwoFactor() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const setup = useAdminSetupTwoFactor();
  const enable = useAdminEnableTwoFactor({
    mutation: {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getAdminGetTwoFactorStatusQueryKey() });
      },
    },
  });

  const startSetup = () => setup.mutate();

  return (
    <div className="container mx-auto py-12 px-4 max-w-xl">
      <Card className="border-emerald-200 shadow-xl">
        <CardHeader className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <div>
              <CardTitle className="text-xl">Activation de la double authentification</CardTitle>
              <p className="text-sm text-slate-300 mt-1">Obligatoire pour accéder à l'espace admin.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {!setup.data ? (
            <>
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertTitle>Préparez votre application d'authentification</AlertTitle>
                <AlertDescription className="text-sm">
                  Téléchargez Google Authenticator, Authy ou 1Password sur votre téléphone, puis cliquez ci-dessous pour générer un nouveau secret.
                </AlertDescription>
              </Alert>
              <Button onClick={startSetup} disabled={setup.isPending} className="w-full" size="lg">
                {setup.isPending ? "Génération..." : "Générer le QR code"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm font-medium text-slate-700">Scannez ce QR code avec votre application :</p>
                <img src={setup.data.qrCodeDataUrl} alt="QR code 2FA" className="w-56 h-56 border-4 border-white rounded-lg shadow-md" />
                <div className="w-full text-center">
                  <p className="text-xs text-slate-500 mb-1">Ou saisissez le code manuellement :</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(setup.data!.secret);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="font-mono text-xs bg-white px-3 py-1.5 rounded border inline-flex items-center gap-2 hover:bg-slate-50"
                  >
                    {setup.data.secret}
                    {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totp-code" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Code à 6 chiffres
                </Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-xl tracking-[0.5em] font-mono"
                  data-testid="input-totp-setup"
                />
              </div>

              {enable.error ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    {(enable.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                      "Code invalide"}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Button
                onClick={() => enable.mutate({ data: { code } })}
                disabled={code.length !== 6 || enable.isPending}
                className="w-full"
                size="lg"
                data-testid="button-enable-2fa"
              >
                {enable.isPending ? "Vérification..." : "Activer la double authentification"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerifyTwoFactor({ email }: { email: string }) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const verify = useAdminVerifyTwoFactor({
    mutation: {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getAdminGetTwoFactorStatusQueryKey() });
      },
    },
  });

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <Card className="border-slate-700 shadow-2xl bg-slate-900 text-slate-100">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-white">Vérification 2FA</CardTitle>
              <p className="text-sm text-slate-400 mt-1">{email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-300">
            Entrez le code à 6 chiffres généré par votre application d'authentification pour ouvrir une session admin.
          </p>
          <div className="space-y-2">
            <Label htmlFor="totp-verify" className="text-slate-200">Code à 6 chiffres</Label>
            <Input
              id="totp-verify"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === 6) verify.mutate({ data: { code } });
              }}
              className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-800 border-slate-700 text-white"
              data-testid="input-totp-verify"
            />
          </div>
          {verify.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(verify.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                  "Code invalide"}
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            onClick={() => verify.mutate({ data: { code } })}
            disabled={code.length !== 6 || verify.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
            size="lg"
            data-testid="button-verify-2fa"
          >
            {verify.isPending ? "Vérification..." : "Déverrouiller l'espace admin"}
          </Button>
          <p className="text-xs text-slate-500 text-center">
            Session valide 8 heures. Toute tentative est journalisée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
