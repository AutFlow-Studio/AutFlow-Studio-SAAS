import {
  Users,
  Plus,
  Upload,
  Search,
  FolderOpen,
  FileText,
  CalendarDays,
  CreditCard,
  BarChart3,
  ArrowRight,
} from "lucide-react";

type EmptyConfig = {
  icon: React.ElementType;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  tips: string[];
  accentColor: string;
};

const CONFIGS: Record<string, EmptyConfig> = {
  clients: {
    icon: Users,
    title: "Add your first client",
    description:
      "Clients are the foundation of your agency. Track projects, payments, and communication all in one place.",
    primaryLabel: "Add a client",
    secondaryLabel: "Import from CSV",
    tips: [
      "Each client gets their own workspace with projects and invoices",
      "Set billing rates and track revenue per client",
      "Share documents and get e-signatures without leaving AutFlow",
    ],
    accentColor: "hsl(221 83% 53%)",
  },
  projects: {
    icon: FolderOpen,
    title: "Create your first project",
    description:
      "Projects help you organise work, track deliverables, and keep clients in the loop automatically.",
    primaryLabel: "New project",
    secondaryLabel: "Use a template",
    tips: [
      "Break projects into deliverables with due dates",
      "Get notified when milestones are at risk",
      "Auto-generate status reports for clients",
    ],
    accentColor: "hsl(262 80% 58%)",
  },
  payments: {
    icon: CreditCard,
    title: "Send your first invoice",
    description:
      "Create professional invoices in seconds and track payment status without chasing clients.",
    primaryLabel: "Create invoice",
    secondaryLabel: "Set up recurring billing",
    tips: [
      "Invoices pull hours and deliverables automatically",
      "Get paid via bank transfer, card, or Stripe",
      "Automatic payment reminders on your schedule",
    ],
    accentColor: "hsl(142 70% 40%)",
  },
};

function EmptyCard({ config }: { config: EmptyConfig }) {
  const Icon = config.icon;
  return (
    <div
      className="flex flex-col items-center text-center max-w-md mx-auto pt-16 pb-8"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Icon */}
      <div className="relative mb-7">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: `${config.accentColor.replace(")", " / 0.1)")}`,
          }}
        >
          <Icon
            className="w-9 h-9"
            style={{ color: config.accentColor }}
          />
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"
          style={{ background: config.accentColor }}
        >
          <Plus className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-xl font-bold text-[hsl(220_30%_12%)] mb-2">
        {config.title}
      </h2>
      <p className="text-sm text-[hsl(215_20%_48%)] leading-relaxed mb-8 max-w-sm">
        {config.description}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-10">
        <button
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
          style={{
            background: config.accentColor,
            boxShadow: `0 4px 14px ${config.accentColor.replace(")", " / 0.3)")}`,
          }}
        >
          <Plus className="w-4 h-4" />
          {config.primaryLabel}
        </button>
        {config.secondaryLabel && (
          <button className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-[hsl(220_20%_35%)] bg-[hsl(215_20%_94%)] hover:bg-[hsl(215_20%_90%)] transition-all">
            <Upload className="w-4 h-4" />
            {config.secondaryLabel}
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="w-full bg-[hsl(210_40%_98%)] rounded-2xl border border-[hsl(215_20%_91%)] p-5 text-left">
        <p className="text-xs font-semibold text-[hsl(215_20%_45%)] uppercase tracking-wider mb-3">
          What you can do
        </p>
        <div className="space-y-2.5">
          {config.tips.map((tip) => (
            <div key={tip} className="flex items-start gap-2.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${config.accentColor.replace(")", " / 0.15)")}` }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: config.accentColor }}
                />
              </div>
              <span className="text-xs text-[hsl(220_20%_35%)] leading-relaxed">
                {tip}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmptyState() {
  return (
    <div
      className="min-h-screen bg-[hsl(210_40%_98%)]"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Simulated page header */}
      <div className="border-b border-[hsl(215_20%_91%)] bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(220_30%_12%)]">Clients</h1>
          <p className="text-xs text-[hsl(215_20%_50%)]">
            Manage your client relationships
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[hsl(215_20%_95%)] rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-[hsl(215_20%_55%)]" />
            <span className="text-sm text-[hsl(215_20%_55%)]">Search clients…</span>
          </div>
          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "hsl(221 83% 53%)" }}
          >
            <Plus className="w-4 h-4" />
            Add client
          </button>
        </div>
      </div>

      {/* Empty content */}
      <div className="px-6">
        <EmptyCard config={CONFIGS.clients} />
      </div>

      {/* Quick links to other empty areas */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-1 bg-white rounded-2xl shadow-lg border border-[hsl(215_20%_91%)] p-1.5">
          {[
            { icon: FolderOpen, label: "Projects" },
            { icon: FileText, label: "Documents" },
            { icon: CalendarDays, label: "Calendar" },
            { icon: CreditCard, label: "Payments" },
            { icon: BarChart3, label: "Reports" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-[hsl(215_20%_45%)] hover:bg-[hsl(215_20%_95%)] transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
