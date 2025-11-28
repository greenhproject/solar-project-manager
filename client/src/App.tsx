import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MainLayout } from "./components/MainLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import NewProject from "./pages/NewProject";
import ProjectDetail from "./pages/ProjectDetail";
import Reminders from "./pages/Reminders";
import AIAssistant from "./pages/AIAssistant";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import GanttChart from "./pages/GanttChart";
import CalendarView from "./pages/CalendarView";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";

function Router() {
  return (
    <Switch>
      {/* Public route */}
      <Route path="/" component={Home} />
      
      {/* Protected routes with MainLayout */}
      <Route path="/dashboard">
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </Route>
      
      <Route path="/projects">
        <MainLayout>
          <Projects />
        </MainLayout>
      </Route>
      
      <Route path="/projects/new">
        <MainLayout>
          <NewProject />
        </MainLayout>
      </Route>
      
      <Route path="/projects/:id">
        <MainLayout>
          <ProjectDetail />
        </MainLayout>
      </Route>
      
      <Route path="/reminders">
        <MainLayout>
          <Reminders />
        </MainLayout>
      </Route>
      
      <Route path="/ai-assistant">
        <MainLayout>
          <AIAssistant />
        </MainLayout>
      </Route>
       <Route path="/user-management">
        <MainLayout>
          <UserManagement />
        </MainLayout>
      </Route>
      
      <Route path="/settings">
        <MainLayout>
          <Settings />
        </MainLayout>
      </Route>
      
      <Route path="/analytics">
        <MainLayout>
          <Analytics />
        </MainLayout>
      </Route>
      
      <Route path="/gantt">
        <MainLayout>
          <GanttChart />
        </MainLayout>
      </Route>
      
      <Route path="/calendar">
        <MainLayout>
          <CalendarView />
        </MainLayout>
      </Route>
      
      <Route path="/advanced-analytics">
        <MainLayout>
          <AdvancedAnalytics />
        </MainLayout>
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Tema configurado en modo claro con paleta solar naranja/ámbar
 * Para hacer el tema intercambiable, agregar prop switchable a ThemeProvider
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
