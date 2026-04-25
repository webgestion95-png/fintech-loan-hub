import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMe, useCreateLoan, getListMyLoansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Upload, X, File, Loader2 } from "lucide-react";

const loanFormSchema = z.object({
  applicantName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  amount: z.coerce.number().min(100, "Le montant minimum est de 100€"),
  durationMonths: z.coerce.number().min(3, "La durée minimale est de 3 mois").max(120, "La durée maximale est de 120 mois"),
  monthlyIncome: z.coerce.number().min(0, "Le revenu doit être positif"),
  purpose: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

export function NewLoan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const createLoan = useCreateLoan();
  
  const [documents, setDocuments] = useState<{ filename: string; contentType: string; dataBase64: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      applicantName: user?.fullName || "",
      amount: 5000,
      durationMonths: 24,
      monthlyIncome: 2000,
      purpose: "",
    },
  });

  const watchAmount = form.watch("amount");
  const watchDuration = form.watch("durationMonths");
  
  const monthlyPayment = (watchAmount || 0) / (watchDuration || 1);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    const newDocs: { filename: string; contentType: string; dataBase64: string }[] = [];
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result?.toString().split(',')[1];
        if (base64String) {
          newDocs.push({
            filename: file.name,
            contentType: file.type,
            dataBase64: base64String
          });
        }
        if (newDocs.length === files.length) {
          setDocuments((prev) => [...prev, ...newDocs]);
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setDocuments(docs => docs.filter((_, i) => i !== index));
  };

  const onSubmit = (data: LoanFormValues) => {
    if (documents.length === 0) {
      toast({
        title: "Documents manquants",
        description: "Veuillez fournir au moins un justificatif (pièce d'identité, etc.)",
        variant: "destructive",
      });
      return;
    }

    createLoan.mutate({
      data: {
        ...data,
        applicantEmail: user?.email || "",
        documents,
      }
    }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListMyLoansQueryKey() });
        toast({
          title: "Demande envoyée",
          description: "Votre demande a été enregistrée avec succès.",
        });
        setLocation(`/loans/${res.id}`);
      },
      onError: (err) => {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'envoi de la demande.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-primary">Demander un prêt</h1>
        <p className="text-muted-foreground mt-1">Complétez ce formulaire pour obtenir une réponse rapide.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Votre projet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant souhaité (€)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="durationMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between">
                          <span>Durée de remboursement</span>
                          <span className="font-bold text-primary">{field.value} mois</span>
                        </FormLabel>
                        <FormControl>
                          <Slider 
                            min={3} 
                            max={120} 
                            step={1} 
                            value={[field.value]} 
                            onValueChange={(val) => field.onChange(val[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motif du prêt (optionnel)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Achat d'un véhicule, travaux..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vos informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="applicantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-muted" />
                    <p className="text-sm text-muted-foreground">Lié à votre compte sécurisé.</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revenus mensuels nets (€)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Justificatifs</CardTitle>
                  <CardDescription>Fournissez une pièce d'identité et un justificatif de domicile ou de revenus.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      id="documents"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label htmlFor="documents" className="cursor-pointer flex flex-col items-center">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                      )}
                      <span className="text-sm font-medium text-foreground">Cliquez pour ajouter des fichiers</span>
                      <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG acceptés</span>
                    </label>
                  </div>

                  {documents.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <File className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm truncate">{doc.filename}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeDocument(idx)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary Sticky Sidebar */}
            <div className="sticky top-24">
              <Card className="border-primary/20 shadow-md">
                <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                  <CardTitle className="text-lg">Simulation</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Montant emprunté</span>
                    <span className="font-bold">{formatCurrency(watchAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Durée</span>
                    <span className="font-bold">{watchDuration || 0} mois</span>
                  </div>
                  <div className="h-px bg-border my-4" />
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium">Mensualité estimée</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(monthlyPayment || 0)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">* hors assurance facultative</p>
                  </div>
                  
                  <Button type="submit" className="w-full mt-6 h-12 text-base" disabled={createLoan.isPending || isUploading}>
                    {createLoan.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Valider ma demande
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
