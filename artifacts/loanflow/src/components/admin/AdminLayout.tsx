import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import {
  useGetMe,
  useAdminTwoFactorLogout,
  getAdminGetTwoFactorStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  LayoutDashboard,
  FolderOpen,
  FileText,
  LogOut,
  ScrollText,
} from "lucide-react";

const NAV: Array<{ href: string; label: string; icon: typeof LayoutDashboard; match: (p: string) => boolean }> = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, match: (p) => p === "/admin" },
  { href: "/admin/loans", label: "Dossiers", icon: FolderOpen, match: (p) => p.startsWith("/admin/loans") },
  { href: "/admin/documents", label: "Documents", icon: FileText, match: (p) => p.startsWith("/admin/documents") },
  { href: "/admin/audit", label: "Journal de sécurité", icon: ScrollText, match: (p) => p.startsWith("/admin/audit") },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user } = useGetMe();
  const qc = useQueryClient();
  const logout2fa = useAdminTwoFactorLogout({
    mutation: {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getAdminGetTwoFactorStatusQueryKey() });
      },
    },
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-serif text-lg font-medium tracking-tight text-white">LoanFlow</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">Espace sécurisé · Admin</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((n) => {
                const active = n.match(location);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs text-slate-400">Connecté en tant que</span>
              <span className="text-sm font-medium text-white">{user?.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => logout2fa.mutate()}
              title="Verrouiller la session 2FA"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              Verrouiller
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-slate-50 text-slate-900">
        {children}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-3 px-6 flex items-center justify-between">
        <span>LoanFlow Admin — accès restreint et journalisé.</span>
        <span className="font-mono">Toutes les actions sont enregistrées.</span>
      </footer>
    </div>
  );
}
