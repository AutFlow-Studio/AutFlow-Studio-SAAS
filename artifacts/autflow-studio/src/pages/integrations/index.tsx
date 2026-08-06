/**
 * Integrations page — owner-only.
 *
 * Generic and provider-agnostic: adding a new provider (Anthropic, Gemini,
 * Grok, …) only requires adding an entry to INTEGRATION_CONFIGS below.
 *
 * Security contract:
 *  - API keys are sent to POST /api/integrations/:provider/configure over
 *    HTTPS and stored encrypted (AES-256-GCM) in the database.
 *  - The server NEVER returns a key value — only a boolean `configured` flag.
 *  - After saving, the input is cleared and the key is not displayed.
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
  Zap,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Lock,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  BrainCircuit,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntegrationStatus {
  configured: boolean;
  source: "db" | "env" | null;
  configuredAt?: string;
}

interface StatusMap {
  [provider: string]: IntegrationStatus;
}

interface TestResult {
  ok: boolean;
  message: string;
  testedAt: Date;
}

// ── Integration registry ──────────────────────────────────────────────────────
// Add a new entry here to support a new provider — no other changes needed.

interface IntegrationConfig {
  provider: string;
  name: string;
  category: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  keyLabel: string;
  keyPlaceholder: string;
  testLabel: string;
  testingLabel: string;
}

const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  {
    provider: "openai",
    name: "OpenAI",
    category: "AI",
    description:
      "Powers the AI Assistant, smart summaries, client health scores, meeting analysis, and all AI-generated insights across AutFlow Studio.",
    icon: Zap,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10",
    keyLabel: "API Key",
    keyPlaceholder: "sk-...",
    testLabel: "Test Connection",
    testingLabel: "Testing…",
  },
  {
    provider: "anthropic",
    name: "Anthropic",
    category: "AI",
    description:
      "Alternative AI provider using Claude models. Use as a drop-in replacement for OpenAI-powered features if you prefer Anthropic.",
    icon: BrainCircuit,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
    keyLabel: "API Key",
    keyPlaceholder: "sk-ant-...",
    testLabel: "Test Connection",
    testingLabel: "Testing…",
  },
  {
    provider: "gemini",
    name: "Google Gemini",
    category: "AI",
    description:
      "Use Google's Gemini models for AI-assisted features. Supports multimodal inputs for document and image analysis.",
    icon: Sparkles,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    keyLabel: "API Key",
    keyPlaceholder: "AIza...",
    testLabel: "Test Connection",
    testingLabel: "Testing…",
  },
  {
    provider: "resend",
    name: "Resend",
    category: "Email",
    description:
      "Sends transactional emails — password resets, email verification, and welcome messages. Without this key, reset links are only logged to the server console.",
    icon: Mail,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10",
    keyLabel: "API Key",
    keyPlaceholder: "re_...",
    testLabel: "Send Test Email",
    testingLabel: "Sending…",
  },
];

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchStatus(): Promise<StatusMap> {
  const res = await fetch("/api/integrations/status", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load integration status");
  return res.json();
}

async function configureIntegration(
  provider: string,
  key: string,
): Promise<{ ok: boolean; message: string; updatedAt?: string }> {
  const res = await fetch(`/api/integrations/${provider}/configure`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return res.json();
}

async function deleteIntegration(
  provider: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/integrations/${provider}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

async function testIntegration(
  provider: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/integrations/${provider}/test`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatus | undefined }) {
  if (status?.configured) {
    return (
      <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/10">
        <CheckCircle2 size={11} />
        Connected
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 text-muted-foreground"
    >
      <XCircle size={11} />
      Not configured
    </Badge>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

interface IntegrationCardProps {
  config: IntegrationConfig;
  status: IntegrationStatus | undefined;
  onStatusChange: (provider: string, status: IntegrationStatus) => void;
}

function IntegrationCard({
  config,
  status,
  onStatusChange,
}: IntegrationCardProps) {
  const { toast } = useToast();
  const [configuring, setConfiguring] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { provider, icon: Icon, iconColor, iconBg, name, category } = config;
  const isConfigured = status?.configured ?? false;

  function openConfigure() {
    setConfiguring(true);
    setKeyValue("");
    setShowKey(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelConfigure() {
    setConfiguring(false);
    setKeyValue("");
    setShowKey(false);
  }

  async function handleSave() {
    if (!keyValue.trim()) return;
    setSaving(true);
    try {
      const result = await configureIntegration(provider, keyValue.trim());
      if (result.ok) {
        onStatusChange(provider, {
          configured: true,
          source: "db",
          configuredAt: result.updatedAt,
        });
        setConfiguring(false);
        setKeyValue("");
        toast({
          title: `${name} configured`,
          description: "API key saved securely.",
        });
      } else {
        toast({
          title: "Save failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Save failed",
        description: "Could not reach the server.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testIntegration(provider);
      setTestResult({ ...result, testedAt: new Date() });
      toast({
        title: result.ok ? `${name} connected` : `${name} test failed`,
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Test failed",
        description: "Could not reach the server.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const result = await deleteIntegration(provider);
      if (result.ok) {
        onStatusChange(provider, { configured: false, source: null });
        setTestResult(null);
        toast({ title: `${name} removed`, description: "Integration disconnected." });
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
            <div
              className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon size={20} className={iconColor} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{name}</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {category}
                </span>
              </div>
              {isConfigured && status?.configuredAt && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated{" "}
                  {formatDistanceToNow(new Date(status.configuredAt), {
                    addSuffix: true,
                  })}
                  {status.source === "env" && " · via environment variable"}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        <CardDescription className="mt-3 leading-relaxed">
          {config.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Test result */}
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
                Tested{" "}
                {formatDistanceToNow(testResult.testedAt, { addSuffix: true })}
              </p>
            </div>
          </div>
        )}

        {/* Configure form */}
        {configuring && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`key-${provider}`} className="text-sm font-medium">
                {config.keyLabel}
              </Label>
              <div className="relative">
                <Input
                  id={`key-${provider}`}
                  ref={inputRef}
                  type={showKey ? "text" : "password"}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder={config.keyPlaceholder}
                  className="pr-10 font-mono text-sm"
                  autoComplete="off"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") cancelConfigure();
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
              </p>
            </div>
            <div className="flex gap-2">
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
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelConfigure}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!configuring && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={isConfigured ? "outline" : "default"}
              onClick={openConfigure}
              className="gap-2"
            >
              <Settings size={14} />
              {isConfigured ? "Update Key" : "Configure"}
            </Button>

            {isConfigured && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testing}
                  onClick={handleTest}
                  className="gap-2"
                >
                  {testing ? (
                    <><Loader2 size={14} className="animate-spin" />{config.testingLabel}</>
                  ) : (
                    <><RefreshCw size={14} />{config.testLabel}</>
                  )}
                </Button>

                {/* Only allow removal if key is stored in DB (not env-only) */}
                {status?.source === "db" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removing}
                    onClick={handleRemove}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {removing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Remove
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  function handleStatusChange(provider: string, status: IntegrationStatus) {
    setStatusMap((prev) => ({ ...prev, [provider]: status }));
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

  const aiIntegrations = INTEGRATION_CONFIGS.filter((c) => c.category === "AI");
  const otherIntegrations = INTEGRATION_CONFIGS.filter((c) => c.category !== "AI");

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

      {/* AI Providers */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          AI Providers
        </h2>
        {aiIntegrations.map((config) => (
          <IntegrationCard
            key={config.provider}
            config={config}
            status={statusMap[config.provider]}
            onStatusChange={handleStatusChange}
          />
        ))}
      </section>

      {/* Other integrations */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Email
        </h2>
        {otherIntegrations.map((config) => (
          <IntegrationCard
            key={config.provider}
            config={config}
            status={statusMap[config.provider]}
            onStatusChange={handleStatusChange}
          />
        ))}
      </section>
    </div>
  );
}
