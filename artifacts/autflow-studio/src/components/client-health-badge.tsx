import { Heart, AlertTriangle, CheckCircle2, Info, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type HealthStatus = "Healthy" | "Stable" | "Needs Attention" | "Risk";

export interface HealthData {
  score: number;
  status: HealthStatus;
  reasons?: string[];
}

interface ClientHealthBadgeProps {
  score?: number | null;
  reasons?: string[];
  /** Show compact mode (just icon + number, no label) */
  compact?: boolean;
}

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 90) return "Healthy";
  if (score >= 70) return "Stable";
  if (score >= 40) return "Needs Attention";
  return "Risk";
}

function statusConfig(status: HealthStatus) {
  switch (status) {
    case "Healthy":
      return {
        icon: CheckCircle2,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        bar: "bg-emerald-500",
        text: "text-emerald-400",
      };
    case "Stable":
      return {
        icon: Info,
        color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20",
        bar: "bg-blue-500",
        text: "text-blue-400",
      };
    case "Needs Attention":
      return {
        icon: Info,
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
        bar: "bg-amber-500",
        text: "text-amber-400",
      };
    case "Risk":
      return {
        icon: AlertTriangle,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
        bar: "bg-red-500",
        text: "text-red-400",
      };
  }
}

/**
 * Displays a client health badge with optional popover showing score breakdown.
 * Accepts pre-computed score from the API (no AI call needed).
 */
export function ClientHealthBadge({
  score,
  reasons = [],
  compact = false,
}: ClientHealthBadgeProps) {
  if (score == null) {
    return (
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-secondary/50 border-border/40 text-muted-foreground"
        title="Health score not yet computed"
      >
        <Heart size={11} />
        {!compact && <span>Health</span>}
      </button>
    );
  }

  const status = getHealthStatus(score);
  const cfg = statusConfig(status);

  const badge = (
    <button
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-all",
        cfg.bg,
        cfg.color,
      )}
      title={`Health: ${status} (${score}/100)`}
    >
      <cfg.icon size={11} />
      <span>{score}</span>
      {!compact && <span className="hidden sm:inline">{status}</span>}
    </button>
  );

  if (reasons.length === 0) return badge;

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" side="top" align="start">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <cfg.icon size={15} className={cfg.color} />
            <span className={cn("text-sm font-semibold", cfg.color)}>{status}</span>
          </div>
          <span className="text-xl font-bold tabular-nums">
            {score}
            <span className="text-xs text-muted-foreground font-normal">/100</span>
          </span>
        </div>

        {/* Score bar */}
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", cfg.bar)}
            style={{ width: `${score}%` }}
          />
        </div>

        {reasons.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <TrendingDown size={11} />
              Factors affecting health
            </p>
            <ul className="space-y-1">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs flex gap-1.5">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
