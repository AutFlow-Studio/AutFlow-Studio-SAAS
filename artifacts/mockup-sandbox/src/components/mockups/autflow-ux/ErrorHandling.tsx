import {
  AlertCircle,
  WifiOff,
  RefreshCw,
  X,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
  MailWarning,
} from "lucide-react";

function ToastStack() {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50" style={{ width: 360 }}>
      {/* Error toast */}
      <div
        className="flex items-start gap-3 bg-white rounded-xl shadow-lg border p-4"
        style={{ borderColor: "hsl(0 84% 60% / 0.3)", borderLeftWidth: 3, borderLeftColor: "hsl(0 84% 60%)" }}
      >
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(0 84% 60%)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[hsl(220_30%_12%)]">Invoice failed to send</p>
          <p className="text-xs text-[hsl(215_20%_48%)] mt-0.5 leading-relaxed">
            The email server rejected the request. Check your SMTP settings or try again.
          </p>
          <button className="mt-2 text-xs font-medium" style={{ color: "hsl(0 84% 60%)" }}>
            View details →
          </button>
        </div>
        <button className="text-[hsl(215_20%_65%)] hover:text-[hsl(215_20%_35%)] flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Warning toast */}
      <div
        className="flex items-start gap-3 bg-white rounded-xl shadow-lg border p-4"
        style={{ borderColor: "hsl(38 92% 50% / 0.3)", borderLeftWidth: 3, borderLeftColor: "hsl(38 92% 50%)" }}
      >
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(38 92% 50%)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[hsl(220_30%_12%)]">Unsaved changes</p>
          <p className="text-xs text-[hsl(215_20%_48%)] mt-0.5">
            You have 3 unsaved edits on this project.
          </p>
        </div>
        <button className="text-[hsl(215_20%_65%)] flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Success toast */}
      <div
        className="flex items-start gap-3 bg-white rounded-xl shadow-lg border p-4"
        style={{ borderColor: "hsl(142 70% 40% / 0.3)", borderLeftWidth: 3, borderLeftColor: "hsl(142 70% 40%)" }}
      >
        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(142 70% 40%)" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[hsl(220_30%_12%)]">Client saved</p>
          <p className="text-xs text-[hsl(215_20%_48%)] mt-0.5">Luminary Studio has been updated.</p>
        </div>
        <button className="text-[hsl(215_20%_65%)] flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FormValidation() {
  return (
    <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] p-6 max-w-md">
      <h3 className="text-sm font-semibold text-[hsl(220_30%_12%)] mb-4">Add client</h3>
      <div className="space-y-4">
        {/* Valid field */}
        <div>
          <label className="block text-xs font-medium text-[hsl(220_20%_30%)] mb-1.5">Client name</label>
          <div className="relative">
            <input
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm pr-9 outline-none"
              style={{
                borderColor: "hsl(142 70% 40% / 0.5)",
                background: "hsl(142 70% 40% / 0.03)",
                color: "hsl(220 20% 12%)",
                fontFamily: "inherit",
              }}
              defaultValue="Luminary Studio"
              readOnly
            />
            <CheckCircle2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "hsl(142 70% 40%)" }}
            />
          </div>
        </div>

        {/* Error field */}
        <div>
          <label className="block text-xs font-medium text-[hsl(220_20%_30%)] mb-1.5">
            Email address
          </label>
          <div className="relative">
            <input
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm pr-9 outline-none"
              style={{
                borderColor: "hsl(0 84% 60%)",
                background: "hsl(0 84% 60% / 0.04)",
                color: "hsl(220 20% 12%)",
                fontFamily: "inherit",
              }}
              defaultValue="not-an-email"
              readOnly
            />
            <AlertCircle
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "hsl(0 84% 60%)" }}
            />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: "hsl(0 84% 60%)" }}>
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Enter a valid email address (e.g. hello@agency.com)
          </p>
        </div>

        {/* Empty required field */}
        <div>
          <label className="block text-xs font-medium text-[hsl(220_20%_30%)] mb-1.5">
            Phone <span className="text-[hsl(215_20%_55%)]">(optional)</span>
          </label>
          <input
            className="w-full rounded-lg border border-[hsl(215_20%_88%)] px-3.5 py-2.5 text-sm outline-none"
            style={{ color: "hsl(220 20% 12%)", fontFamily: "inherit" }}
            placeholder="+1 (555) 000-0000"
            readOnly
          />
        </div>

        {/* Form-level error banner */}
        <div
          className="rounded-xl p-3.5 flex items-start gap-2.5"
          style={{ background: "hsl(0 84% 60% / 0.06)", border: "1px solid hsl(0 84% 60% / 0.2)" }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "hsl(0 84% 60%)" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "hsl(0 70% 40%)" }}>
              Please fix 1 error before continuing
            </p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(0 60% 45%)" }}>
              Check the highlighted field above.
            </p>
          </div>
        </div>

        <button
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white"
          style={{ background: "hsl(221 83% 53%)" }}
        >
          Save client
        </button>
      </div>
    </div>
  );
}

function NetworkError() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 px-6"
      style={{ minHeight: 320 }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "hsl(215 20% 93%)" }}
      >
        <WifiOff className="w-8 h-8 text-[hsl(215_20%_50%)]" />
      </div>
      <h3 className="text-lg font-bold text-[hsl(220_30%_12%)] mb-2">
        Can't reach the server
      </h3>
      <p className="text-sm text-[hsl(215_20%_48%)] max-w-xs leading-relaxed mb-6">
        Check your internet connection or try again. Your unsaved changes are safe.
      </p>
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "hsl(221 83% 53%)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
        <button className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-[hsl(220_20%_35%)] bg-[hsl(215_20%_94%)]">
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </div>
  );
}

export function ErrorHandling() {
  return (
    <div
      className="min-h-screen bg-[hsl(210_40%_98%)] p-6"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Toast stack */}
      <ToastStack />

      {/* Section labels + content */}
      <div className="max-w-4xl mx-auto space-y-8 pt-4">
        <div>
          <p className="text-xs font-semibold text-[hsl(215_20%_45%)] uppercase tracking-wider mb-3">
            Toast Notifications
          </p>
          <div className="bg-[hsl(215_20%_93%)] rounded-2xl p-4 flex items-center justify-center" style={{ minHeight: 160 }}>
            <p className="text-sm text-[hsl(215_20%_50%)]">← Toast stack shown in corner →</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-[hsl(215_20%_45%)] uppercase tracking-wider mb-3">
              Form Validation
            </p>
            <FormValidation />
          </div>

          <div>
            <p className="text-xs font-semibold text-[hsl(215_20%_45%)] uppercase tracking-wider mb-3">
              Network / Server Error
            </p>
            <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)]">
              <NetworkError />
            </div>
          </div>
        </div>

        {/* Inline error in a data table row */}
        <div>
          <p className="text-xs font-semibold text-[hsl(215_20%_45%)] uppercase tracking-wider mb-3">
            Inline Row Error
          </p>
          <div className="bg-white rounded-2xl border border-[hsl(215_20%_92%)] overflow-hidden">
            {[
              { name: "Luminary Studio", status: "active", ok: true },
              { name: "Nova Digital", status: "overdue", ok: false, error: "Invoice #0042 is 14 days overdue" },
              { name: "Apex Ventures", status: "active", ok: true },
            ].map(({ name, status, ok, error }) => (
              <div
                key={name}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-[hsl(215_20%_94%)] last:border-0"
                style={!ok ? { background: "hsl(0 84% 60% / 0.03)" } : undefined}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: ok ? "hsl(221 83% 53%)" : "hsl(0 84% 60%)" }}
                >
                  {name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[hsl(220_30%_12%)]">{name}</p>
                  {error && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "hsl(0 70% 45%)" }}>
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs font-medium rounded-full px-2.5 py-1"
                  style={ok
                    ? { background: "hsl(142 70% 40% / 0.1)", color: "hsl(142 70% 35%)" }
                    : { background: "hsl(0 84% 60% / 0.1)", color: "hsl(0 70% 45%)" }
                  }
                >
                  {ok ? "Active" : "Action needed"}
                </span>
                <ChevronRight className="w-4 h-4 text-[hsl(215_20%_55%)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
