import { useAdminGetAuditLog } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "2FA_SETUP_INITIATED": "Configuration 2FA — début",
  "2FA_ENABLED": "2FA activée",
  "2FA_ENABLE": "Activation 2FA — code soumis",
  "2FA_VERIFY": "Vérification 2FA",
  "2FA_LOGOUT": "Verrouillage de session",
};

export function AdminAuditLog() {
  const { data: logs, isLoading } = useAdminGetAuditLog();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-slate-900">Journal de sécurité</h1>
        <p className="text-slate-600 mt-1">
          100 dernières actions admin (authentifications, 2FA, accès).
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quand</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Résultat</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Navigateur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : !logs || logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  Aucune entrée de journal.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((l) => (
                <TableRow key={l.id} data-testid={`row-audit-${l.id}`}>
                  <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                    {formatDateTime(l.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{l.email ?? "—"}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {ACTION_LABELS[l.action] ?? l.action}
                  </TableCell>
                  <TableCell>
                    {l.success ? (
                      <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Succès
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">
                        <XCircle className="h-3 w-3 mr-1" /> Échec
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{l.ipAddress ?? "—"}</TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[280px] truncate" title={l.userAgent ?? ""}>
                    {l.userAgent ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
