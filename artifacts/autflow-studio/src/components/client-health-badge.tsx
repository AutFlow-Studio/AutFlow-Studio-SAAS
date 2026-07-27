import { useState } from "react";
import { Heart, Loader2, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface HealthData {
  score: number;
  status: "Healthy" | "Needs Attention" | "At Risk";
  summary: string;
  reasons: string[];
}

interface ClientHealthBadgeProps {
  clientId: number;
  clientName?: string;
}

function statusConfig(status: HealthData["status"]) {
  switch (status) {
    case "Healthy":
      return {
        icon: CheckCircle2,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        bar: "bg-emerald-500",
      };
    case "Needs Attention":
      return {
        icon: Info,
        color: "text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/20",
        bar: "bg-yellow-500",
      };
    case "At Risk":
      return {
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        bar: "bg-red-500",
      };
  }
}

export function ClientHealthBadge({ clientId, clientName }: ClientHealthBadgeProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function fetchHealth() {
    if (health || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/client-health/${clientId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Failed to fetch health score");
      }
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) fetchHealth();
  }

  const cfg = health ? statusConfig(health.status) : null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all",
            cfg
              ? cn(cfg.bg, cfg.color)
              : "bg-secondary/50 border-border/40 text-muted-foreground hover:text-foreground",
          )}
          title="Client Health Score"
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : cfg ? (
            <cfg.icon size={11} />
          ) : (
            <Heart size={11} />
          )}
          {health ? (
            <span>{health.score}</span>
          ) : loading ? null : (
            <span>Health</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4 space-y-3" side="top" align="start">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={14} className="animate-spin" />
            Analysing client health…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {health && cfg && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <cfg.icon size={15} className={cfg.color} />
                <span className={cn("text-sm font-semibold", cfg.color)}>{health.status}</span>
              </div>
              <span className="text-xl font-bold tabular-nums">{health.score}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
            </div>

            {/* Score bar */}
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", cfg.bar)}
                style={{ width: `${health.score}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">{health.summary}</p>

            {health.reasons.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Reasons
                </p>
                <ul className="space-y-1">
                  {health.reasons.map((r, i) => (
                    <li key={i} className="text-xs flex gap-1.5">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => { setHealth(null); fetchHealth(); }}
            >
              <Loader2 size={11} className="mr-1" />
              Refresh
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
