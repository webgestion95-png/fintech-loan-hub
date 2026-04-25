import { useState } from "react";
import { Link } from "wouter";
import { useAdminListLoans, useGetMe } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, statusMap } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowRight, FilterX } from "lucide-react";
import { Redirect } from "wouter";

export function AdminLoanList() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: loans, isLoading } = useAdminListLoans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  if (isUserLoading) return <div className="p-8"><Skeleton className="h-64" /></div>;
  if (user?.role !== "ADMIN") return <Redirect to="/403" />;

  const filteredLoans = loans?.filter((loan) => {
    const matchesSearch = 
      loan.applicantName.toLowerCase().includes(search.toLowerCase()) || 
      loan.applicantEmail.toLowerCase().includes(search.toLowerCase()) ||
      loan.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary">Gestion des dossiers</h1>
        <p className="text-muted-foreground mt-1">Liste complète des demandes de prêt.</p>
      </div>

      <Card className="mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b bg-muted/10">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, email, ou n° de dossier..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(statusMap).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || statusFilter !== "ALL") && (
              <Button variant="ghost" size="icon" onClick={() => { setSearch(""); setStatusFilter("ALL"); }} title="Effacer les filtres">
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dossier</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Durée</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredLoans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucun dossier trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filteredLoans?.map((loan) => (
                <TableRow key={loan.id} className="hover:bg-muted/30 cursor-pointer group" onClick={() => window.location.assign(`/admin/loans/${loan.id}`)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{loan.id.slice(0,8)}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{loan.applicantName}</div>
                    <div className="text-xs text-muted-foreground">{loan.applicantEmail}</div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{loan.durationMonths} mois</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(loan.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusMap[loan.status]?.color || ""}>
                      {statusMap[loan.status]?.label || loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/admin/loans/${loan.id}`}>
                        Ouvrir <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
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
