import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AgencyProfileProvider } from '@/components/agency-profile-provider';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { PortalAuthProvider, usePortalAuth } from '@/components/portal-auth-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Layout } from '@/components/layout';
import { PortalLayout } from '@/components/portal-layout';
import LoginPage from '@/pages/login/index';
import SignupPage from '@/pages/signup/index';
import VerifyEmailPage from '@/pages/verify-email/index';
import ForgotPasswordPage from '@/pages/forgot-password/index';
import ResetPasswordPage from '@/pages/reset-password/index';
import { useState } from 'react';

import Dashboard from '@/pages/dashboard';
import ClientsList from '@/pages/clients/index';
import ClientDetail from '@/pages/clients/detail';
import ProjectsList from '@/pages/projects/index';
import ProjectDetail from '@/pages/projects/detail';
import PaymentsList from '@/pages/payments/index';
import PaymentDetail from '@/pages/payments/detail';
import CalendarView from '@/pages/calendar/index';
import DocumentsList from '@/pages/documents/index';
import ReportsView from '@/pages/reports/index';
import TasksList from '@/pages/tasks/index';
import SearchResults from '@/pages/search/index';
import SettingsView from '@/pages/settings/index';
import MeetingsList from '@/pages/meetings/index';
import CampaignsList from '@/pages/campaigns/index';
import DeliverablesView from '@/pages/deliverables/index';
import TeamView from '@/pages/team/index';
import AIAssistantPage from '@/pages/ai-assistant/index';
import IntegrationsPage from '@/pages/integrations/index';
import { useAgencyProfile } from '@/components/agency-profile-provider';

// Client Portal pages
import PortalLoginPage from '@/pages/portal/login';
import PortalDashboard from '@/pages/portal/dashboard';
import PortalProjects from '@/pages/portal/projects';
import PortalProjectDetail from '@/pages/portal/project-detail';
import PortalDocuments from '@/pages/portal/documents';
import PortalPayments from '@/pages/portal/payments';
import PortalMessages from '@/pages/portal/messages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

// ── Smart dashboard ───────────────────────────────────────────────────────────

function SmartDashboard() {
  return <Dashboard />;
}

// ── Agency team routes ────────────────────────────────────────────────────────

function AgencyRouter() {
  return (
    <Switch>
      <Route path="/" component={SmartDashboard} />
      <Route path="/clients" component={ClientsList} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/projects" component={ProjectsList} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/campaigns" component={CampaignsList} />
      <Route path="/deliverables" component={DeliverablesView} />
      <Route path="/team" component={TeamView} />
      <Route path="/ai-assistant" component={AIAssistantPage} />
      <Route path="/payments" component={PaymentsList} />
      <Route path="/payments/:id" component={PaymentDetail} />
      <Route path="/meetings" component={MeetingsList} />
      <Route path="/calendar" component={CalendarView} />
      <Route path="/documents" component={DocumentsList} />
      <Route path="/reports" component={ReportsView} />
      <Route path="/tasks" component={TasksList} />
      <Route path="/search" component={SearchResults} />
      <Route path="/settings" component={SettingsView} />
      <Route path="/integrations" component={IntegrationsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AgencyAuthGate() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  // Always-public pages — no auth required
  if (location === '/forgot-password') return <ForgotPasswordPage />;
  if (location.startsWith('/reset-password')) return <ResetPasswordPage />;

  // Verify-email: accessible regardless of auth state (link arrives via email)
  if (location.startsWith('/verify-email')) return <VerifyEmailPage />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  // Not yet authenticated — show signup or login
  if (!user) {
    if (location === '/signup') return <SignupPage />;
    return <LoginPage />;
  }

  // Authenticated — render the app (handles any leftover /signup location too)
  return (
    <Layout>
      <AgencyRouter />
    </Layout>
  );
}

// ── Client portal routes ──────────────────────────────────────────────────────

function PortalRouter() {
  return (
    <Switch>
      <Route path="/portal/projects/:id" component={PortalProjectDetail} />
      <Route path="/portal/projects" component={PortalProjects} />
      <Route path="/portal/documents" component={PortalDocuments} />
      <Route path="/portal/payments" component={PortalPayments} />
      <Route path="/portal/messages" component={PortalMessages} />
      <Route path="/portal" component={PortalDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PortalGate() {
  const { user, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <PortalLoginPage />;
  }

  return (
    <PortalLayout>
      <PortalRouter />
    </PortalLayout>
  );
}

// ── Root routing — split between /portal/* and everything else ────────────────

function RootRouter() {
  const [location] = useLocation();
  const isPortal = location.startsWith('/portal');

  if (isPortal) {
    return (
      <PortalAuthProvider>
        <PortalGate />
      </PortalAuthProvider>
    );
  }

  return <AgencyAuthGate />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="autflow-studio-theme">
        <AuthProvider>
          <AgencyProfileProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                  <RootRouter />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </QueryClientProvider>
          </AgencyProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
