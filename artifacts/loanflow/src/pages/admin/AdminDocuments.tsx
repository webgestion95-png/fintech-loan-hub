import { useMemo, useState } from "react";
import { useAdminListAllDocuments } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye, FileText, Image as ImageIcon, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { LOAN_STATUS, type LoanStatus } from "@/lib/status";

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType.includes("pdf")) return FileText;
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType.includes("csv"))
    return FileSpreadsheet;
  return FileText;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(2)} Mo`;
}

export function AdminDocuments() {
  const { data: docs, isLoading } = useAdminListAllDocuments();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{
    loanId: string;
    docId: string;
    filename: string;
    contentType: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = search.toLowerCase().trim();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        d.filename.toLowerCase().includes(q) ||
        d.applicantName.toLowerCase().includes(q) ||
        d.applicantEmail.toLowerCase().includes(q) ||
        d.loanId.toLowerCase().includes(q),
    );
  }, [docs, search]);

  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "") + "/api";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-slate-900">Tous les documents</h1>
        <p className="text-slate-600 mt-1">
          Pièces justificatives transmises par les emprunteurs ({docs?.length ?? 0} fichiers).
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 flex items-center gap-3 border-b bg-slate-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par fichier, demandeur, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-document-search"
            />
          </div>
          <span className="text-sm text-slate-500 ml-auto">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Fichier</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead>Dossier</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Taille</TableHead>
              <TableHead>Reçu le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  Aucun document trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => {
                const Icon = fileIcon(d.contentType);
                const status = LOAN_STATUS[d.loanStatus as LoanStatus];
                return (
                  <TableRow key={d.id} data-testid={`row-doc-${d.id}`} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-slate-600" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{d.filename}</div>
                          <div className="text-xs text-slate-500 font-mono">{d.contentType}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {d.userFullName ?? d.applicantName}
                      </div>
                      <div className="text-xs text-slate-500">{d.applicantEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs text-slate-500">#{d.loanId.slice(0, 8)}</div>
                      <div className="text-sm text-slate-700 mt-0.5">{formatCurrency(d.loanAmount)}</div>
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <Badge variant="outline" className="text-xs">
                          {status.label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">{d.loanStatus}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatBytes(d.sizeBytes)}</TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDateTime(d.uploadedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreview({
                              loanId: d.loanId,
                              docId: d.id,
                              filename: d.filename,
                              contentType: d.contentType,
                            })
                          }
                          data-testid={`button-preview-${d.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Aperçu
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`${apiBase}/loans/${d.loanId}/documents/${d.id}`}
                            download={d.filename}
                            data-testid={`link-download-${d.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="truncate">{preview?.filename}</DialogTitle>
          </DialogHeader>
          {preview ? (
            preview.contentType.startsWith("image/") ? (
              <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-6">
                <img
                  src={`${apiBase}/loans/${preview.loanId}/documents/${preview.docId}`}
                  alt={preview.filename}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={`${apiBase}/loans/${preview.loanId}/documents/${preview.docId}`}
                className="flex-1 w-full bg-slate-100"
                title={preview.filename}
              />
            )
          ) : null}
          <div className="px-6 py-3 border-t bg-slate-50 flex justify-end gap-2">
            <Button variant="outline" asChild>
              <a
                href={preview ? `${apiBase}/loans/${preview.loanId}/documents/${preview.docId}` : "#"}
                download={preview?.filename}
              >
                <Download className="h-4 w-4 mr-2" /> Télécharger
              </a>
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
