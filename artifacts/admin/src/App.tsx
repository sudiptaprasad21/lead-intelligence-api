import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { isAuthenticated } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {authed ? (
          <Dashboard onLogout={() => setAuthed(false)} />
        ) : (
          <Login onLogin={() => setAuthed(true)} />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
