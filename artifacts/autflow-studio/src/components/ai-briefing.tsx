import { useState } from "react";
import { Sparkles, AlertTriangle, CreditCard, Users, Briefcase, CheckSquare, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Briefing {
  headline: string;
  urgentActions: string[];
  riskAlerts: string[];
  paymentIssues: string[];
  clientFollowUps: string[];
  projectProblems: string[];
}

interface BriefingSection {
  key: keyof Omit<Briefing, "headline">;
  label: string;
  icon: React.ElementType;
  color: string;
}

const SECTIONS: BriefingSection[] = [
  { key: "urgentActions", label: "Urgent Actions", icon: CheckSquare, color: "text-orange-400" },
  { key: "riskAlerts", label: "Risk Alerts", icon: AlertTriangle, color: "text-red-400" },
  { key: "paymentIssues", label: "Payment Issues", icon: CreditCard, color: "text-yellow-400" },
  { key: "clientFollowUps", label: "Client Follow-ups", icon: Users, color: "text-blue-400" },
  { key: "projectProblems", label: "Project Problems", icon: Briefcase, color: "text-purple-400" },
];

export function AIBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function fetchBriefing() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/briefing", { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Failed to generate briefing");
      }
      const data = await res.json();
      setBriefing(data.briefing);
      setGeneratedAt(data.generatedAt);
      setExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const totalItems = briefing
    ? Object.values(briefing).flat().length - 1 // exclude headline
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-primary" />
            Today's Business Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {briefing && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={fetchBriefing}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} className={cn(briefing && "text-muted-foreground")} />
              )}
              {briefing ? "Refresh" : "Generate Briefing"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!briefing && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <Sparkles size={24} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Click <strong>Generate Briefing</strong> to get your AI-powered daily overview —
              urgent actions, risks, payments, and more.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Analysing your workspace…</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {briefing && expanded && (
          <div className="space-y-4">
            {/* Headline */}
            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-sm font-medium text-foreground">{briefing.headline}</p>
              {generatedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Generated {new Date(generatedAt).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SECTIONS.map(({ key, label, icon: Icon, color }) => {
                const items = briefing[key];
                if (!items.length) return null;
                return (
                  <div key={key} className="rounded-lg border border-border/50 bg-card/50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon size={13} className={color} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {label}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={i} className="text-xs text-foreground flex gap-1.5">
                          <span className="text-muted-foreground mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {totalItems === 0 && (
              <p className="text-sm text-center text-muted-foreground py-2">
                ✅ Everything looks good — no urgent issues today.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
