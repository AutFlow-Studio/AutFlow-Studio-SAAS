import { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Briefing {
  headline: string;
  goingWell: string[];
  needsAttention: string[];
  criticalRisks: string[];
  recommendedActions: string[];
}

interface Section {
  key: keyof Omit<Briefing, "headline">;
  label: string;
  icon: React.ElementType;
  theme: {
    card: string;
    icon: string;
    label: string;
    bullet: string;
    dot: string;
  };
}

const SECTIONS: Section[] = [
  {
    key: "goingWell",
    label: "Going Well",
    icon: CheckCircle2,
    theme: {
      card: "border-emerald-500/20 bg-emerald-500/5",
      icon: "text-emerald-400",
      label: "text-emerald-400",
      bullet: "text-emerald-500/60",
      dot: "bg-emerald-500",
    },
  },
  {
    key: "needsAttention",
    label: "Needs Attention",
    icon: AlertTriangle,
    theme: {
      card: "border-amber-500/20 bg-amber-500/5",
      icon: "text-amber-400",
      label: "text-amber-400",
      bullet: "text-amber-500/60",
      dot: "bg-amber-500",
    },
  },
  {
    key: "criticalRisks",
    label: "Critical Risks",
    icon: ShieldAlert,
    theme: {
      card: "border-red-500/20 bg-red-500/5",
      icon: "text-red-400",
      label: "text-red-400",
      bullet: "text-red-500/60",
      dot: "bg-red-500",
    },
  },
  {
    key: "recommendedActions",
    label: "Recommended Actions",
    icon: Zap,
    theme: {
      card: "border-primary/20 bg-primary/5",
      icon: "text-primary",
      label: "text-primary",
      bullet: "text-primary/60",
      dot: "bg-primary",
    },
  },
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
        throw new Error((body as { error?: string }).error ?? "Failed to generate briefing");
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
    ? briefing.goingWell.length +
      briefing.needsAttention.length +
      briefing.criticalRisks.length +
      briefing.recommendedActions.length
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 border border-primary/20">
              <Sparkles size={14} className="text-primary" />
            </div>
            AI Business Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {briefing && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
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
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles size={20} className="text-primary/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/70">Get your AI-powered executive briefing</p>
              <p className="text-xs text-muted-foreground mt-1">
                Analysed from your live workspace data — clients, projects, payments, and tasks.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
            <Loader2 size={20} className="animate-spin text-primary" />
            <p className="text-sm">Analysing your workspace data…</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error.includes("OPENAI_API_KEY") || error.includes("not configured")
              ? "AI is not configured. Set the OPENAI_API_KEY secret to enable briefings."
              : error}
          </div>
        )}

        {briefing && expanded && (
          <div className="space-y-4">
            {/* Headline */}
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {briefing.headline}
              </p>
              {generatedAt && (
                <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                  Generated at {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>

            {/* 4-section grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SECTIONS.map(({ key, label, icon: Icon, theme }) => {
                const items = briefing[key];
                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border p-3.5 transition-colors",
                      theme.card,
                      items.length === 0 && "opacity-50",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon size={14} className={theme.icon} />
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", theme.label)}>
                        {label}
                      </span>
                      {items.length > 0 && (
                        <span
                          className={cn(
                            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white",
                            theme.dot,
                          )}
                        >
                          {items.length}
                        </span>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nothing to report.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className="text-xs text-foreground flex gap-2 leading-relaxed">
                            <span className={cn("mt-0.5 shrink-0", theme.bullet)}>▸</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {totalItems === 0 && (
              <p className="text-sm text-center text-emerald-400 py-2 flex items-center justify-center gap-2">
                <CheckCircle2 size={14} />
                Everything looks healthy — no urgent issues today.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
