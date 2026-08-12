import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Home } from "./pages/Home";
import { Assessment } from "./pages/Assessment";
import { RecoveryPlanPage } from "./pages/RecoveryPlan";
import { Tracking } from "./pages/Tracking";
import { Suggestions } from "./pages/Suggestions";
import { Dashboard } from "./pages/Dashboard";
import { Labs } from "./pages/Labs";
import { Report } from "./pages/Report";
import { AiAssistant } from "./pages/AiAssistant";
import { AdminPanel } from "./pages/AdminPanel";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/assessment" component={Assessment} />
      <Route path="/recovery-plan" component={RecoveryPlanPage} />
      <Route path="/tracking" component={Tracking} />
      <Route path="/suggestions" component={Suggestions} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/labs" component={Labs} />
      <Route path="/report" component={Report} />
      <Route path="/ai-assistant" component={AiAssistant} />
      <Route path="/admin" component={AdminPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

