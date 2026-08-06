/**
 * Integrations page — owner-only.
 *
 * Shows OpenAI and Resend connection status and lets the workspace owner
 * run a live connection test. API keys are never returned to the frontend;
 * the server only exposes a boolean `configured` flag.
 */
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Zap,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntegrationStatus {
  openai: { configured: boolean };
  resend: { configured: boolean; fromEmail: string };
}

interface TestResult {
  ok: boolean;
  message: string;
  testedAt: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchStatus(): Promise<IntegrationStatus> {
  const res = await fetch("/api/integrations/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}

async function runTest(service: "openai" | "resend"): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/integrations/${service}/test`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json();
  return body;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ configured }: { configured: boolean }) {
  if (configured) {
    return (
      <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10">
        <CheckCircle2 size={11} />
        Connected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
      <XCircle size={11} />
      Not configured
    </Badge>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

interface IntegrationCardProps {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  name: string;
  description: string;
  configured: boolean;
  testLabel: string;
  testingLabel: string;
  meta?: string;
  envVar: string;
  docsUrl: string;
  testResult: TestResult | null;
  onTest: () => void;
  testing: boolean;
}

function IntegrationCard({
  icon: Icon,
  iconColor,
  iconBg,
  name,
  description,
  configured,
  testLabel,
  testingLabel,
  meta,
  envVar,
  docsUrl,
  testResult,
  onTest,
  testing,
}: IntegrationCardProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              {meta && (
                <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
              )}
            </div>
          </div>
          <StatusBadge configured={configured} />
        </div>
        <CardDescription className="mt-3 leading-relaxed">{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Last test result */}
        {testResult && (
          <div
            className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
              testResult.ok
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={15} className="mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-snug">{testResult.message}</p>
              <p className="opacity-70 text-xs mt-0.5">
                Tested {formatDistanceToNow(testResult.testedAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            variant={configured ? "default" : "outline"}
            disabled={!configured || testing}
            onClick={onTest}
            className="gap-2"
          >
            {testing ? (
              <><Loader2 size={14} className="animate-spin" />{testingLabel}</>
            ) : (
              <><RefreshCw size={14} />{testLabel}</>
            )}
          </Button>

          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            How to get an API key
            <ExternalLink size={11} />
          </a>
        </div>

        {/* Setup hint */}
        {!configured && (
          <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 leading-relaxed">
            Add{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground/80">
              {envVar}
            </code>{" "}
            to your environment secrets to enable this integration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [testingResend, setTestingResend] = useState(false);
  const [openAIResult, setOpenAIResult] = useState<TestResult | null>(null);
  const [resendResult, setResendResult] = useState<TestResult | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchStatus();
      setStatus(s);
    } catch {
      toast({ title: "Failed to load status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user?.role === "owner") {
      loadStatus();
    } else {
      setLoading(false);
    }
  }, [user?.role, loadStatus]);

  async function handleTestOpenAI() {
    setTestingOpenAI(true);
    try {
      const result = await runTest("openai");
      const testResult = { ...result, testedAt: new Date() };
      setOpenAIResult(testResult);
      toast({
        title: result.ok ? "OpenAI connected" : "OpenAI test failed",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Test failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setTestingOpenAI(false);
    }
  }

  async function handleTestResend() {
    setTestingResend(true);
    try {
      const result = await runTest("resend");
      const testResult = { ...result, testedAt: new Date() };
      setResendResult(testResult);
      toast({
        title: result.ok ? "Test email sent" : "Resend test failed",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Test failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setTestingResend(false);
    }
  }

  // Non-owner guard
  if (user?.role !== "owner") {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <PageHeader
          title="Integrations"
          description="Manage your external API connections."
        />
        <Card className="bg-card/40 border-border/50 mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Lock size={32} className="text-muted-foreground/50" />
            <p className="font-medium">Owner access required</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Only workspace owners can view and manage API integrations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <PageHeader
          title="Integrations"
          description="Manage your external API connections."
        />
        <div className="flex items-center gap-2 text-muted-foreground mt-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect external services to power AI features and transactional email. API keys are stored as server-side secrets and are never exposed to the browser."
      />

      {/* Security notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Lock size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            API keys are stored in environment secrets and evaluated server-side only.
            This page only shows whether a key is present — it never returns key values to the browser.
          </p>
        </CardContent>
      </Card>

      {/* OpenAI */}
      <IntegrationCard
        icon={Zap}
        iconColor="text-violet-400"
        iconBg="bg-violet-500/10"
        name="OpenAI"
        description="Powers the AI Assistant, smart summaries, client health scores, meeting analysis, and all AI-generated insights across AutFlow Studio."
        configured={status?.openai.configured ?? false}
        testLabel="Test Connection"
        testingLabel="Testing…"
        envVar="OPENAI_API_KEY"
        docsUrl="https://platform.openai.com/api-keys"
        testResult={openAIResult}
        onTest={handleTestOpenAI}
        testing={testingOpenAI}
      />

      {/* Resend */}
      <IntegrationCard
        icon={Mail}
        iconColor="text-sky-400"
        iconBg="bg-sky-500/10"
        name="Resend"
        description="Sends transactional emails — password reset, email verification, and welcome messages. Without this key, password reset links are only logged to the server console."
        configured={status?.resend.configured ?? false}
        testLabel="Send Test Email"
        testingLabel="Sending…"
        meta={status?.resend.configured ? `Sending from: ${status.resend.fromEmail}` : undefined}
        envVar="RESEND_API_KEY"
        docsUrl="https://resend.com/api-keys"
        testResult={resendResult}
        onTest={handleTestResend}
        testing={testingResend}
      />
    </div>
  );
}
