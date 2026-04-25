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
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <svg width="120" height="24" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <path d="M12 28L20 12L28 28H12Z" fill="currentColor"/>
              <path d="M20 28C24.4183 28 28 24.4183 28 20C28 15.5817 24.4183 12 20 12C15.5817 12 12 15.5817 12 20C12 24.4183 15.5817 28 20 28Z" fill="currentColor" fillOpacity="0.3"/>
              <text x="38" y="27" fontFamily="Georgia, serif" fontSize="22" fontWeight="bold" fill="currentColor">LoanFlow</text>
            </svg>
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
