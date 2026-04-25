import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="text-4xl font-serif text-primary mb-4">Accès Refusé</h1>
      <p className="text-xl text-muted-foreground max-w-md mb-8">
        Vous n'avez pas les droits d'administration nécessaires pour accéder à cette page.
      </p>
      <Button asChild size="lg">
        <Link href="/">Retour à l'accueil</Link>
      </Button>
    </div>
  );
}
