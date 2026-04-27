import { Link, useLocation } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { data: user } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false },
  });

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md shadow-accent/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17L9 11L13 15L21 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 7H21V13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="font-serif text-xl font-medium tracking-tight text-foreground">LoanFlow</span>
          </Link>

          <Show when="signed-in">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/loans" className={`transition-colors hover:text-foreground/80 ${location === "/loans" ? "text-foreground" : "text-foreground/60"}`}>
                Mes prêts
              </Link>
              <Link href="/loans/new" className={`transition-colors hover:text-foreground/80 ${location === "/loans/new" ? "text-foreground" : "text-foreground/60"}`}>
                Demander un prêt
              </Link>
              {user?.role === "ADMIN" && (
                <Link href="/admin" className={`transition-colors hover:text-foreground/80 ${location.startsWith("/admin") ? "text-foreground" : "text-foreground/60"}`}>
                  Admin
                </Link>
              )}
            </nav>
          </Show>
        </div>

        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Demander un prêt</Link>
            </Button>
          </Show>
          
          <Show when="signed-in">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden md:inline-block">
                {user?.fullName || user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Déconnexion
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
