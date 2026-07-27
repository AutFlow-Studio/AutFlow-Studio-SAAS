import { useState } from "react";
import {
  CheckCircle2,
  Building2,
  Palette,
  Settings2,
  Database,
  Sparkles,
  ArrowRight,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Workspace", icon: Building2 },
  { id: 2, label: "Brand", icon: Palette },
  { id: 3, label: "Preferences", icon: Settings2 },
  { id: 4, label: "Data", icon: Database },
];

const FEATURES = [
  { icon: Users, text: "Manage all your clients in one place" },
  { icon: TrendingUp, text: "Track revenue and project health" },
  { icon: Shield, text: "AI-powered insights and alerts" },
];

export function Onboarding() {
  const [activeStep] = useState(1);

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 text-white"
        style={{
          background:
            "linear-gradient(145deg, hsl(220 30% 8%) 0%, hsl(221 60% 18%) 100%)",
        }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-16">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(221 83% 53%)" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              AutFlow Studio
            </span>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold leading-snug mb-4">
              Your agency command center
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              Set up your workspace in a few steps and start running your agency like a world-class operation.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <Icon className="w-4 h-4 text-white/80" />
                </div>
                <span className="text-sm text-white/75">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div
          className="rounded-xl p-5"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <p className="text-sm text-white/70 italic leading-relaxed mb-3">
            "AutFlow cut our project reporting time by 80% in the first month."
          </p>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "hsl(221 83% 53%)" }}
            >
              SL
            </div>
            <div>
              <p className="text-xs font-medium text-white/90">Sarah L.</p>
              <p className="text-xs text-white/50">Founder, Luminary Studio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[hsl(210_40%_98%)] p-6">
        <div className="w-full max-w-md">
          {/* Step progress */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isComplete = step.id < activeStep;
              const isActive = step.id === activeStep;
              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isComplete
                          ? "hsl(221 83% 53%)"
                          : isActive
                            ? "hsl(221 83% 53%)"
                            : "hsl(215 20% 90%)",
                        boxShadow: isActive
                          ? "0 0 0 4px hsl(221 83% 53% / 0.15)"
                          : "none",
                      }}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <Icon
                          className="w-4 h-4"
                          style={{ color: isActive ? "white" : "hsl(215 20% 55%)" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{
                        color: isActive
                          ? "hsl(221 83% 53%)"
                          : isComplete
                            ? "hsl(221 83% 53%)"
                            : "hsl(215 20% 55%)",
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-8 h-px mb-4"
                      style={{
                        background:
                          step.id < activeStep
                            ? "hsl(221 83% 53%)"
                            : "hsl(215 20% 85%)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[hsl(215_20%_92%)] p-8">
            <div className="mb-7">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "hsl(221 83% 53% / 0.1)" }}
              >
                <Building2
                  className="w-6 h-6"
                  style={{ color: "hsl(221 83% 53%)" }}
                />
              </div>
              <h2 className="text-xl font-bold text-[hsl(220_30%_12%)] mb-1.5">
                Tell us about your agency
              </h2>
              <p className="text-sm text-[hsl(215_20%_50%)] leading-relaxed">
                This helps us personalise your workspace and set the right defaults.
              </p>
            </div>

            <div className="space-y-4 mb-7">
              <div>
                <label className="block text-sm font-medium text-[hsl(220_20%_25%)] mb-1.5">
                  Agency name
                </label>
                <input
                  className="w-full rounded-lg border border-[hsl(215_20%_88%)] px-3.5 py-2.5 text-sm text-[hsl(220_20%_15%)] outline-none transition-all"
                  placeholder="e.g. Luminary Creative Studio"
                  style={{ fontFamily: "inherit" }}
                  defaultValue=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(220_20%_25%)] mb-1.5">
                  Business email
                </label>
                <input
                  className="w-full rounded-lg border border-[hsl(215_20%_88%)] px-3.5 py-2.5 text-sm text-[hsl(220_20%_15%)] outline-none"
                  placeholder="hello@youragency.com"
                  style={{ fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[hsl(220_20%_25%)] mb-1.5">
                  Team size
                </label>
                <select
                  className="w-full rounded-lg border border-[hsl(215_20%_88%)] px-3.5 py-2.5 text-sm text-[hsl(220_20%_15%)] outline-none bg-white"
                  style={{ fontFamily: "inherit" }}
                >
                  <option>Just me</option>
                  <option>2–5 people</option>
                  <option>6–15 people</option>
                  <option>16+ people</option>
                </select>
              </div>
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all"
              style={{
                background: "hsl(221 83% 53%)",
                boxShadow: "0 4px 14px hsl(221 83% 53% / 0.35)",
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-xs text-[hsl(215_20%_55%)] mt-5">
            Already set up?{" "}
            <span
              className="font-medium cursor-pointer"
              style={{ color: "hsl(221 83% 53%)" }}
            >
              Skip to dashboard
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
