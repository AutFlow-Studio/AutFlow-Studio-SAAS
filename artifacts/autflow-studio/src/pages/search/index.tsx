import { useState } from "react";
import { useGlobalSearch, getGlobalSearchQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/page-header";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Briefcase, 
  CreditCard, 
  FileText, 
  Calendar,
  CheckSquare,
  ChevronRight,
  Search,
  Sparkles,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Smart search result types ──────────────────────────────────────────────

interface SmartResult {
  type: string;
  title: string;
  detail: string;
  url?: string;
}

interface SmartSearchResponse {
  answer: string;
  results: SmartResult[];
  insight: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIconForType(type: string) {
  switch (type) {
    case "client": return <Building2 className="text-blue-500" />;
    case "project": return <Briefcase className="text-primary" />;
    case "payment": return <CreditCard className="text-emerald-500" />;
    case "note": case "document": return <FileText className="text-amber-500" />;
    case "meeting": return <Calendar className="text-purple-500" />;
    case "task": return <CheckSquare className="text-pink-500" />;
    default: return <Search className="text-muted-foreground" />;
  }
}

function getLinkForType(type: string, id: number, url?: string | null) {
  if (url) return url;
  switch (type) {
    case "client": return `/clients/${id}`;
    case "project": return `/projects/${id}`;
    case "payment": return `/payments`;
    default: return `/search`;
  }
}

// ─── Smart Search Panel ──────────────────────────────────────────────────────

function SmartSearchPanel({ query }: { query: string }) {
  const [smartQuery, setSmartQuery] = useState(query);
  const [result, setResult] = useState<SmartSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EXAMPLE_QUERIES = [
    "Which clients haven't replied recently?",
    "How much revenue is expected this month?",
    "Which projects are risky?",
    "Who owes me money?",
    "What needs my attention today?",
  ];

  async function runSmartSearch(q: string) {
    if (!q.trim()) return;
    setSmartQuery(q);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Smart search failed");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-sm font-semibold">AI Smart Search</span>
          <span className="text-xs text-muted-foreground">— ask in plain language</span>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); runSmartSearch(smartQuery); }}
        >
          <input
            type="text"
            value={smartQuery}
            onChange={(e) => setSmartQuery(e.target.value)}
            placeholder="Ask anything about your business..."
            className="flex-1 h-10 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          />
          <Button type="submit" disabled={loading || !smartQuery.trim()} className="gap-1.5">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Ask AI
          </Button>
        </form>
        {/* Example queries */}
        {!result && !loading && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => runSmartSearch(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-secondary/60 border border-border/40 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 size={15} className="animate-spin" />
          Analysing your workspace data…
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Direct answer */}
          <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Answer</p>
            <p className="text-sm leading-relaxed">{result.answer}</p>
          </div>

          {/* Insight */}
          {result.insight && (
            <div className="flex gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
              <Lightbulb size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground">{result.insight}</p>
            </div>
          )}

          {/* Results list */}
          {result.results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matching Items</p>
              {result.results.map((r, i) => (
                <Link key={i} href={r.url ?? "#"}>
                  <Card className="bg-card/40 border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          {getIconForType(r.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{r.title}</p>
                          {r.detail && <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {r.type}
                        </span>
                        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SearchResults() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState<"keyword" | "ai">("keyword");

  const { data, isLoading } = useGlobalSearch(
    { q: query },
    { query: { enabled: query.length > 2, queryKey: getGlobalSearchQueryKey({ q: query }) } }
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader 
        title={query ? `Search: "${query}"` : "Search"} 
        description={data ? `${data.total} keyword results` : "Search your workspace"}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-secondary/40 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("keyword")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "keyword"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-1.5">
            <Search size={13} />
            Keyword Search
          </span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            activeTab === "ai"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={13} />
            AI Smart Search
          </span>
        </button>
      </div>

      {activeTab === "keyword" ? (
        <>
          {query.length <= 2 ? (
            <div className="text-center py-20 text-muted-foreground text-sm border rounded-xl bg-card/30 border-dashed">
              Please enter at least 3 characters to search.
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !data || data.results.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm border rounded-xl bg-card/30 border-dashed">
              No results found for "{query}". Try different keywords or use{" "}
              <button className="text-primary underline" onClick={() => setActiveTab("ai")}>AI Smart Search</button>.
            </div>
          ) : (
            <div className="grid gap-3">
              {data.results.map((result, i) => (
                <Link key={`${result.type}-${result.id}-${i}`} href={getLinkForType(result.type, result.id, result.url)}>
                  <Card className="bg-card/40 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors cursor-pointer group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          {getIconForType(result.type)}
                        </div>
                        <div>
                          <div className="font-semibold group-hover:text-primary transition-colors">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-sm text-muted-foreground mt-0.5">{result.subtitle}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded">
                          {result.type}
                        </span>
                        <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <SmartSearchPanel query={query} />
      )}
    </div>
  );
}
