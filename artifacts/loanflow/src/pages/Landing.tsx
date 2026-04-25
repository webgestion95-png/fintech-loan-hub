import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, Zap, Clock } from "lucide-react";

export function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-serif text-primary tracking-tight mb-8 leading-tight">
            Financer vos projets<br />avec confiance.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            LoanFlow est la nouvelle génération de banque française offrant des prêts personnels rapides, transparents et sécurisés.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full" asChild>
              <Link href="/sign-up">Demander un prêt maintenant</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full bg-white" asChild>
              <Link href="/sign-in">J'ai déjà un compte</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-6">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Réponse en 24h</h3>
              <p className="text-muted-foreground leading-relaxed">
                Notre équipe d'experts analyse votre dossier rapidement. Fini les semaines d'attente interminables.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">100% Sécurisé</h3>
              <p className="text-muted-foreground leading-relaxed">
                Vos données sont chiffrées de bout en bout. Nous respectons les standards bancaires les plus stricts.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-foreground">Sans frais cachés</h3>
              <p className="text-muted-foreground leading-relaxed">
                Le taux affiché est le taux appliqué. Aucune surprise sur vos mensualités.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-serif text-center text-primary mb-16">Comment ça marche ?</h2>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {[
              { title: "Simulez votre prêt", desc: "Choisissez le montant et la durée qui vous conviennent. Nous calculons immédiatement votre mensualité estimée." },
              { title: "Complétez votre dossier", desc: "Remplissez le formulaire en 5 minutes et téléchargez vos justificatifs (pièce d'identité, justificatif de domicile, fiches de paie)." },
              { title: "Signez votre contrat", desc: "Dès acceptation par notre équipe, signez votre contrat électroniquement en toute sécurité." },
              { title: "Recevez vos fonds", desc: "Une fois le délai légal passé, les fonds sont disponibles dans votre portefeuille LoanFlow, prêts à être retirés." }
            ].map((step, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                  {i + 1}
                </div>
                <Card className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] hover-elevate">
                  <CardContent className="p-6">
                    <h4 className="text-lg font-bold mb-2">{step.title}</h4>
                    <p className="text-muted-foreground text-sm">{step.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-serif mb-8">Prêt à concrétiser vos projets ?</h2>
          <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-full" asChild>
            <Link href="/sign-up">Commencer ma demande</Link>
          </Button>
        </div>
      </section>

      <footer className="py-10 text-center text-sm text-muted-foreground bg-white border-t border-border">
        <p>© {new Date().getFullYear()} LoanFlow. Tous droits réservés.</p>
        <p className="mt-2 text-xs">Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.</p>
      </footer>
    </div>
  );
}
