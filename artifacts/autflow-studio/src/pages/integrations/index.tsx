/**
 * Integrations page — owner-only.
 *
 * AI section: single unified card — paste any key (OpenAI, Anthropic, Gemini,
 * or any OpenAI-compatible endpoint), the server auto-detects the provider.
 * Never exposes the stored key value.
 *
 * Adding a new AI provider only requires updating detection logic server-side —
 * no UI changes needed.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import {
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  BrainCircuit,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

type DetectedProvider = "openai" | "anthropic" | "gemini" | "openai-compatible";

interface AiStatus {
  configured: boolean;
  source: "db" | "env" | null;
  configuredAt?: string;
  detectedProvider?: DetectedProvider;
  model?: string | null;
  baseUrl?: string | null;
}

interface SimpleStatus {
  configured: boolean;
  source: "db" | "env" | null;
  configuredAt?: string;
}

interface StatusMap {
  ai?: AiStatus;
  resend?: SimpleStatus;
  [key: string]: AiStatus | SimpleStatus | undefined;
}

interface TestResult {
  ok: boolean;
  message: string;
  detectedProvider?: DetectedProvider;
  model?: string | null;
  testedAt: Date;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<DetectedProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  "openai-compatible": "OpenAI-compatible",
};

function providerLabel(p?: DetectedProvider): string {
  return p ? (PROVIDER_LABELS[p] ?? p) : "Unknown";
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchStatus(): Promise<StatusMap> {
  const res = await fetch("/api/integrations/status", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}

async function configureIntegration(
  provider: string,
  key: string,
  baseUrl?: string,
): Promise<{ ok: boolean; message: string; updatedAt?: string; detectedProvider?: DetectedProvider }> {
  const res = await fetch(`/api/integrations/${provider}/configure`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, baseUrl: baseUrl || undefined }),
  });
  return res.json();
}

async function deleteIntegration(provider: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/integrations/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

async function testIntegration(
  provider: string,
): Promise<{ ok: boolean; message: string; detectedProvider?: DetectedProvider; model?: string | null }> {
  const res = await fetch(`/api/integrations/${provider}/test`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

// ── Status badge ───────────────────────────────────────────────────────────────

function ConnectedBadge() {
  return (
    <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10">
      <CheckCircle2 size={11} />
      Connected
    </Badge>
  );
}

function NotConfiguredBadge() {
  return (
    <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
      <XCircle size={11} />
      Not configured
    </Badge>
  );
}

// ── Test result banner ─────────────────────────────────────────────────────────

function TestResultBanner({ result }: { result: TestResult }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
        result.ok
          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          : "bg-destructive/10 border border-destructive/20 text-destructive"
      }`}
    >
      {result.ok ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={15} className="mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium leading-snug">{result.message}</p>
        <p className="opacity-70 text-xs mt-0.5">
          Tested {formatDistanceToNow(result.testedAt, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

// ── AI Configuration card ──────────────────────────────────────────────────────

interface AiCardProps {
  status: AiStatus | undefined;
  onStatusChange: (status: AiStatus) => void;
}

function AiConfigCard({ status, onStatusChange }: AiCardProps) {
  const { toast } = useToast();
  const [keyValue, setKeyValue] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured = status?.configured ?? false;
  const canRemove = status?.source === "db";

  async function handleSave() {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      const result = await configureIntegration("ai", keyValue.trim(), baseUrl.trim() || undefined);
      if (result.ok) {
        onStatusChange({
          configured: true,
          source: "db",
          configuredAt: result.updatedAt,
          detectedProvider: result.detectedProvider,
          model: null,
          baseUrl: baseUrl.trim() || null,
        });
        setKeyValue("");
        setBaseUrl("");
        setShowAdvanced(false);
        toast({
          title: "AI configured",
          description: result.detectedProvider
            ? `Detected ${providerLabel(result.detectedProvider)}. Run Test Connection to verify.`
            : "API key saved securely.",
        });
      } else {
        toast({ title: "Save failed", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Save failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testIntegration("ai");
      setTestResult({ ...result, testedAt: new Date() });
      if (result.ok) {
        // Update status with freshly confirmed provider + model
        onStatusChange({
          ...status,
          configured: true,
          source: status?.source ?? "db",
          detectedProvider: result.detectedProvider ?? status?.detectedProvider,
          model: result.model ?? status?.model ?? null,
        });
        toast({ title: "AI connected", description: result.message });
      } else {
        toast({ title: "Test failed", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Test failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const result = await deleteIntegration("ai");
      if (result.ok) {
        onStatusChange({ configured: false, source: null });
        setTestResult(null);
        toast({ title: "AI integration removed", description: "API key deleted." });
      } else {
        toast({ title: "Remove failed", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Remove failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={20} className="text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">AI Configuration</CardTitle>
              {isConfigured && status?.configuredAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {formatDistanceToNow(new Date(status.configuredAt), { addSuffix: true })}
                  {status.source === "env" && " · via environment variable"}
                </p>
              )}
            </div>
          </div>
          {isConfigured ? <ConnectedBadge /> : <NotConfiguredBadge />}
        </div>

        <CardDescription className="mt-3 leading-relaxed">
          Powers the AI Assistant, smart summaries, client health scores, and all AI-generated
          insights across AutFlow Studio. Supports OpenAI, Anthropic, Google Gemini, and any
          OpenAI-compatible endpoint.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connected state: detected provider + model */}
        {isConfigured && (status?.detectedProvider || status?.model) && (
          <div className="flex flex-wrap gap-2">
            {status.detectedProvider && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-muted/60 border border-border/40 text-muted-foreground rounded-md px-2.5 py-1">
                Provider: <span className="text-foreground font-medium">{providerLabel(status.detectedProvider)}</span>
              </span>
            )}
            {status.model && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-muted/60 border border-border/40 text-muted-foreground rounded-md px-2.5 py-1">
                Model: <span className="text-foreground font-medium">{status.model}</span>
              </span>
            )}
          </div>
        )}

        {/* Test result banner */}
        {testResult && <TestResultBanner result={testResult} />}

        {/* Configure form (always visible so key can be updated) */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-key" className="text-sm font-medium">
              API Key
            </Label>
            <div className="relative">
              <Input
                id="ai-key"
                ref={inputRef}
                type={showKey ? "text" : "password"}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={isConfigured ? "Enter a new key to replace the current one" : "sk-… or AIza… or sk-ant-…"}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Key is encrypted before storage and never returned to the browser.
              Provider is detected automatically.
            </p>
          </div>

          {/* Advanced: Base URL (collapsed by default) */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                size={13}
                className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              Base URL (optional — for OpenAI-compatible providers)
            </button>

            {showAdvanced && (
              <div className="mt-2.5 space-y-1.5">
                <Input
                  id="ai-baseurl"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-provider.com/v1"
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for OpenAI, Anthropic, or Gemini. Required for self-hosted
                  or third-party OpenAI-compatible APIs (e.g. Together, Groq, Ollama).
                </p>
              </div>
            )}
          </div>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!keyValue.trim() || saving}
            className="gap-2"
          >
            {saving ? (
              <><Loader2 size={13} className="animate-spin" />Saving…</>
            ) : (
              "Save"
            )}
          </Button>
        </div>

        {/* Test + Remove */}
        {isConfigured && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              disabled={testing}
              onClick={handleTest}
              className="gap-2"
            >
              {testing ? (
                <><Loader2 size={14} className="animate-spin" />Testing…</>
              ) : (
                <><RefreshCw size={14} />Test Connection</>
              )}
            </Button>

            {canRemove && (
              <Button
                size="sm"
                variant="ghost"
                disabled={removing}
                onClick={handleRemove}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Email (Resend) card ────────────────────────────────────────────────────────

interface EmailCardProps {
  status: SimpleStatus | undefined;
  onStatusChange: (status: SimpleStatus) => void;
}

function EmailCard({ status, onStatusChange }: EmailCardProps) {
  const { toast } = useToast();
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfigured = status?.configured ?? false;
  const canRemove = status?.source === "db";

  async function handleSave() {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      const result = await configureIntegration("resend", keyValue.trim());
      if (result.ok) {
        onStatusChange({ configured: true, source: "db", configuredAt: result.updatedAt });
        setKeyValue("");
        toast({ title: "Resend configured", description: "API key saved securely." });
      } else {
        toast({ title: "Save failed", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Save failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testIntegration("resend");
      setTestResult({ ...result, testedAt: new Date() });
      toast({
        title: result.ok ? "Resend connected" : "Test failed",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch {
      toast({ title: "Test failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const result = await deleteIntegration("resend");
      if (result.ok) {
        onStatusChange({ configured: false, source: null });
        setTestResult(null);
        toast({ title: "Resend removed", description: "Integration disconnected." });
      } else {
        toast({ title: "Remove failed", description: result.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Remove failed", description: "Could not reach the server.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
              <Mail size={20} className="text-sky-400" />
            </div>
            <div>
              <CardTitle className="text-base">Resend</CardTitle>
              {isConfigured && status?.configuredAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {formatDistanceToNow(new Date(status.configuredAt), { addSuffix: true })}
                  {status.source === "env" && " · via environment variable"}
                </p>
              )}
            </div>
          </div>
          {isConfigured ? <ConnectedBadge /> : <NotConfiguredBadge />}
        </div>
        <CardDescription className="mt-3 leading-relaxed">
          Sends transactional emails — password resets, email verification, and welcome messages.
          Without this key, reset links are only logged to the server console.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {testResult && <TestResultBanner result={testResult} />}

        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="resend-key" className="text-sm font-medium">API Key</Label>
            <div className="relative">
              <Input
                id="resend-key"
                ref={inputRef}
                type={showKey ? "text" : "password"}
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder={isConfigured ? "Enter a new key to replace the current one" : "re_…"}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Key is encrypted before storage and never returned to the browser.
            </p>
          </div>
          <Button size="sm" onClick={handleSave} disabled={!keyValue.trim() || saving} className="gap-2">
            {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : "Save"}
          </Button>
        </div>

        {isConfigured && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={testing} onClick={handleTest} className="gap-2">
              {testing ? (
                <><Loader2 size={14} className="animate-spin" />Sending…</>
              ) : (
                <><RefreshCw size={14} />Send Test Email</>
              )}
            </Button>
            {canRemove && (
              <Button
                size="sm" variant="ghost" disabled={removing} onClick={handleRemove}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remove
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchStatus();
      setStatusMap(s);
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

  // Non-owner guard
  if (user?.role !== "owner") {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <PageHeader title="Integrations" description="Manage your external API connections." />
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
        <PageHeader title="Integrations" description="Manage your external API connections." />
        <div className="flex items-center gap-2 text-muted-foreground mt-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect external services to power AI features and transactional email."
      />

      {/* Security notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Lock size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            API keys are encrypted with AES-256-GCM and stored in your workspace database.
            They are evaluated server-side only — this page never exposes key values to the browser.
          </p>
        </CardContent>
      </Card>

      {/* AI */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          AI
        </h2>
        <AiConfigCard
          status={statusMap.ai as AiStatus | undefined}
          onStatusChange={(s) => setStatusMap((prev) => ({ ...prev, ai: s }))}
        />
      </section>

      {/* Email */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Email
        </h2>
        <EmailCard
          status={statusMap.resend as SimpleStatus | undefined}
          onStatusChange={(s) => setStatusMap((prev) => ({ ...prev, resend: s }))}
        />
      </section>
    </div>
  );
}
