import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Mail, Loader2, RefreshCw } from "lucide-react";

type State = "checking" | "success" | "error" | "pending";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<State>("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Extract token from URL
  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) {
      // No token in URL — user just signed up, show "check your inbox"
      setState("pending");
      return;
    }

    // Token present — try to verify
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setState("success");
          await refreshUser();
          setTimeout(() => navigate("/"), 2000);
        } else {
          setState("error");
          setErrorMsg(data.error ?? "Verification failed. The link may have expired.");
        }
      } catch {
        setState("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    })();
  }, [token, navigate, refreshUser]);

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setResent(true);
        toast({ title: "Email sent", description: "Check your inbox for a new verification link." });
      } else {
        const data = await res.json();
        toast({ title: "Failed to resend", description: data.error ?? "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to resend", description: "Please try again.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary-foreground"
            >
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
              <path d="M12 3v6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">AutFlow Studio</h1>
        </div>

        {/* Checking */}
        {state === "checking" && (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
            <Loader2 size={40} className="animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Verifying your email address…</p>
          </div>
        )}

        {/* Pending — show "check your inbox" */}
        {state === "pending" && (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Mail size={30} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a verification link to{" "}
                <span className="text-foreground font-medium">{user?.email}</span>.
                Click the link to activate your workspace.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder, or request a new link.
              </p>
              <button
                onClick={handleResend}
                disabled={resending || resent}
                className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {resending ? (
                  <><Loader2 size={14} className="animate-spin" /> Sending…</>
                ) : resent ? (
                  <><CheckCircle2 size={14} className="text-green-500" /> Email sent!</>
                ) : (
                  <><RefreshCw size={14} /> Resend verification email</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {state === "success" && (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={30} className="text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Email verified!</h2>
              <p className="text-sm text-muted-foreground">
                Your account is now active. Redirecting you to your workspace…
              </p>
            </div>
            <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto" />
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-5">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Mail size={30} className="text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Verification failed</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
            </div>
            {user && (
              <button
                onClick={handleResend}
                disabled={resending || resent}
                className="w-full h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {resending ? (
                  <><Loader2 size={14} className="animate-spin" /> Sending…</>
                ) : resent ? (
                  <><CheckCircle2 size={14} className="text-green-500" /> Email sent!</>
                ) : (
                  <><RefreshCw size={14} /> Request new link</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
