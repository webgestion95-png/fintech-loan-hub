import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-serif text-primary mb-2">404 - Page introuvable</h1>
          <p className="text-sm text-muted-foreground">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
