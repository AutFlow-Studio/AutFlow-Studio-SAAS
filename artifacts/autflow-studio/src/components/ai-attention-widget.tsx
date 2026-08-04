import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface AttentionItem {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  url: string;
}

interface AttentionFeed {
  items: AttentionItem[];
  totalCount: number;
  generatedAt: string;
}

function SeverityIcon({ severity }: { severity: AttentionItem["severity"] }) {
  if (severity === "critical") return <XCircle size={14} className="text-red-400 shrink-0" />;
  if (severity === "warning") return <AlertTriangle size={14} className="text-amber-400 shrink-0" />;
  return <AlertCircle size={14} className="text-primary/70 shrink-0" />;
}

function itemRowClass(severity: AttentionItem["severity"]) {
  if (severity === "critical")
    return "border-red-500/15 bg-red-500/5 hover:bg-red-500/10";
  if (severity === "warning")
    return "border-amber-500/15 bg-amber-500/5 hover:bg-amber-500/10";
  return "border-primary/15 bg-primary/5 hover:bg-primary/10";
}

export function AIAttentionWidget() {
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<AttentionFeed>({
      queryKey: ["/api/ai/agency-attention"],
      queryFn: async () => {
        const res = await fetch("/api/ai/agency-attention", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load attention feed");
        return res.json();
      },
      staleTime: 3 * 60 * 1000, // 3 min
    });

  const items = data?.items ?? [];
  const criticalCount = items.filter((i) => i.severity === "critical").length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20">
              <Bot size={14} className="text-violet-500" />
            </div>
            AI Attention Feed
            {criticalCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                {criticalCount}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw size={12} className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading && (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Scanning workspace…</span>
          </div>
        )}

        {isError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            Could not load attention feed.
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground/60">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <p className="text-xs text-center text-emerald-400 font-medium">
              All clear — no urgent items right now.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <Link key={i} href={item.url}>
                <div
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer",
                    itemRowClass(item.severity),
                  )}
                >
                  <div className="mt-0.5">
                    <SeverityIcon severity={item.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {item.detail}
                    </p>
                  </div>
                  <ArrowRight size={11} className="shrink-0 mt-1 text-muted-foreground/40" />
                </div>
              </Link>
            ))}

            <div className="pt-1">
              <Link href="/ai-assistant">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 transition-colors cursor-pointer">
                  <Sparkles size={12} className="text-violet-500" />
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    Ask the AI for a full briefing
                  </span>
                  <ArrowRight size={10} className="ml-auto text-violet-500/50" />
                </div>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
