import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import Pricing from "@/pages/Pricing";
import Events from "@/pages/Events";
import Leads from "@/pages/Leads";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  const isLeadsPage = location === "/leads";

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {!isLeadsPage && <NavBar />}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/events" component={Events} />
          <Route path="/leads" component={Leads} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isLeadsPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="nexpoint-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;