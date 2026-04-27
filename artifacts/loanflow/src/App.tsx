import { useEffect, useRef } from "react";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Navbar } from "@/components/layout/Navbar";
import { SignInPage, SignUpPage } from "@/pages/auth/AuthPages";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(167 48% 18%)",
    colorForeground: "hsl(167 48% 18%)",
    colorMutedForeground: "hsl(167 20% 45%)",
    colorDanger: "hsl(0 70% 50%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(45 20% 90%)",
    colorInputForeground: "hsl(167 48% 18%)",
    colorNeutral: "hsl(45 20% 85%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-border shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
  },
};

import { Landing } from "@/pages/Landing";
import { UserDashboard } from "@/pages/loans/UserDashboard";
import { NewLoan } from "@/pages/loans/NewLoan";
import { LoanDetail } from "@/pages/loans/LoanDetail";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminLoanList } from "@/pages/admin/AdminLoanList";
import { AdminLoanDetail } from "@/pages/admin/AdminLoanDetail";
import { AdminDocuments } from "@/pages/admin/AdminDocuments";
import { AdminAuditLog } from "@/pages/admin/AdminAuditLog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGate } from "@/components/admin/AdminGate";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { useGetMe } from "@workspace/api-client-react";

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SignedInHomeRedirect />
      </Show>
      <Show when="signed-out">
        <Layout>
          <Landing />
        </Layout>
      </Show>
    </>
  );
}

function SignedInHomeRedirect() {
  const { data: user, isLoading } = useGetMe();
  if (isLoading) return null;
  if (user?.role === "ADMIN") return <Redirect to="/admin" />;
  return <Redirect to="/loans" />;
}

function UserOnlyRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  if (isLoading) return null;
  if (user?.role === "ADMIN") return <Redirect to="/admin" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <AdminGate>{children}</AdminGate>
    </AdminLayout>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: { title: "Bon retour", subtitle: "Connectez-vous à votre compte" },
        },
        signUp: {
          start: { title: "Créer un compte", subtitle: "Commencez dès aujourd'hui" },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/loans">
            <Layout><UserOnlyRoute><UserDashboard /></UserOnlyRoute></Layout>
          </Route>
          <Route path="/loans/new">
            <Layout><UserOnlyRoute><NewLoan /></UserOnlyRoute></Layout>
          </Route>
          <Route path="/loans/:id">
            <Layout><UserOnlyRoute><LoanDetail /></UserOnlyRoute></Layout>
          </Route>

          <Route path="/admin">
            <AdminRoute><AdminDashboard /></AdminRoute>
          </Route>
          <Route path="/admin/loans">
            <AdminRoute><AdminLoanList /></AdminRoute>
          </Route>
          <Route path="/admin/loans/:id">
            <AdminRoute><AdminLoanDetail /></AdminRoute>
          </Route>
          <Route path="/admin/documents">
            <AdminRoute><AdminDocuments /></AdminRoute>
          </Route>
          <Route path="/admin/audit">
            <AdminRoute><AdminAuditLog /></AdminRoute>
          </Route>

          <Route path="/403">
            <Layout><ForbiddenPage /></Layout>
          </Route>
          
          <Route>
            <Layout>
              <NotFound />
            </Layout>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
