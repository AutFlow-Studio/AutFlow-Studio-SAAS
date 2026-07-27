import { useState } from "react";
import { usePortalAuth } from "@/components/portal-auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Command } from "lucide-react";

export default function PortalLoginPage() {
  const { login } = usePortalAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password.";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm space-y-8 my-auto">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <Command size={22} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Portal</h1>
            <p className="text-sm text-muted-foreground">Sign in to view your project updates</p>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Access is provided by your agency. Contact them if you need help signing in.
        </p>
      </div>
    </div>
  );
}
