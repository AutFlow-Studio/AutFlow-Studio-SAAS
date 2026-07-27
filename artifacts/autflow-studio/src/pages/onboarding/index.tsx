import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  Building2,
  Palette,
  Settings2,
  Database,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  agencyName: string;
  agencyEmail: string;
  website: string;
  supportEmail: string;
  logoUrl: string | null;
  defaultCurrency: string;
  timezone: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  notifyInvoicePaid: boolean;
  notifyDeadlineApproaching: boolean;
  notifyWeeklyDigest: boolean;
}

interface OnboardingWizardProps {
  onComplete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "BRL", label: "BRL — Brazilian Real" },
  { value: "MXN", label: "MXN — Mexican Peso" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "ZAR", label: "ZAR — South African Rand" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const PAYMENT_TERMS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 45, label: "45 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];

const TOTAL_FORM_STEPS = 4; // steps 1–4 (0 = welcome, 5 = done)

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function requestUploadUrl(
  file: File
): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Failed to get upload URL");
  }
  return res.json();
}

async function uploadToStorage(file: File): Promise<string> {
  const { uploadURL, objectPath } = await requestUploadUrl(file);
  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!uploadRes.ok) throw new Error("Upload failed");
  return objectPath;
}

function storageUrl(objectPath: string): string {
  return `/api/storage${objectPath}`;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_META = [
  { icon: Building2, label: "Company" },
  { icon: Palette, label: "Brand" },
  { icon: Settings2, label: "Preferences" },
  { icon: Database, label: "Data" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEP_META.map((step, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                done
                  ? "bg-primary text-primary-foreground"
                  : active
                  ? "bg-primary/20 text-primary ring-2 ring-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? (
                <CheckCircle2 size={14} />
              ) : (
                <step.icon size={13} />
              )}
            </div>
            <span
              className={`text-xs hidden sm:block transition-colors ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {i < STEP_META.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 transition-all duration-500 ${
                  done ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const pct = step === 0 ? 0 : step >= 5 ? 100 : ((step - 1) / TOTAL_FORM_STEPS) * 100;
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-border">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Logo upload ──────────────────────────────────────────────────────────────

function LogoUpload({
  logoUrl,
  agencyName,
  onUpload,
  onClear,
}: {
  logoUrl: string | null;
  agencyName: string;
  onUpload: (path: string) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Images only", description: "Please choose a PNG, JPG, or WebP file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const objectPath = await uploadToStorage(file);
      onUpload(objectPath);
      toast({ title: "Logo uploaded", description: "Your agency logo has been saved." });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload logo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div className="relative group flex-shrink-0">
        <div
          className="w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border flex items-center justify-center cursor-pointer"
          onClick={() => !uploading && inputRef.current?.click()}
        >
          {logoUrl ? (
            <img src={storageUrl(logoUrl)} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Building2 size={24} />
              <span className="text-[10px]">No logo</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
              <Loader2 size={18} className="animate-spin text-primary" />
            </div>
          )}
        </div>
        {logoUrl && (
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} className="text-destructive-foreground" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Agency Logo</p>
        <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. Max 5 MB.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const [data, setData] = useState<WizardData>({
    agencyName: "",
    agencyEmail: "",
    website: "",
    supportEmail: "",
    logoUrl: null,
    defaultCurrency: "USD",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    invoicePrefix: "INV",
    paymentTermsDays: 30,
    notifyInvoicePaid: true,
    notifyDeadlineApproaching: true,
    notifyWeeklyDigest: true,
  });

  const patch = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  function goNext() {
    setDirection("forward");
    setStep((s) => s + 1);
  }

  function goBack() {
    setDirection("back");
    setStep((s) => s - 1);
  }

  // Save all settings and mark onboarding complete
  async function saveAndFinish(loadDemo: boolean) {
    setSaving(true);
    try {
      // Save agency settings
      const settingsRes = await fetch("/api/settings/agency", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          onboardingCompleted: true,
        }),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

      // Load demo data if requested
      if (loadDemo) {
        setLoadingDemo(true);
        const demoRes = await fetch("/api/admin/seed-demo", {
          method: "POST",
          credentials: "include",
        });
        setLoadingDemo(false);
        if (!demoRes.ok) {
          toast({
            title: "Demo data couldn't load",
            description: "Your settings were saved. You can add demo data later from Settings.",
            variant: "destructive",
          });
        }
      }

      setDirection("forward");
      setStep(5); // Done screen
    } catch (err) {
      toast({
        title: "Couldn't save settings",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setLoadingDemo(false);
    }
  }

  const animKey = `step-${step}`;

  return (
    <div className="fixed inset-0 bg-background overflow-y-auto z-50">
      {/* Subtle background radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08)_0%,_transparent_60%)] pointer-events-none" />

      {/* Inner wrapper: centers card when there is room, scrolls naturally when there isn't */}
      <div className="relative flex flex-col items-center p-4 min-h-full">
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto"
        style={{ minHeight: 520 }}
      >
        <ProgressBar step={step} />

        {/* Header with step indicator (hidden on welcome and done) */}
        {step > 0 && step < 5 && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <StepIndicator current={step} />
            <span className="text-xs text-muted-foreground tabular-nums">
              {step} / {TOTAL_FORM_STEPS}
            </span>
          </div>
        )}

        {/* Step content */}
        <div
          key={animKey}
          className="px-6 py-6"
          style={{
            animation: `onboardSlideIn 0.3s ease-out`,
          }}
        >
          {step === 0 && <WelcomeStep onStart={goNext} />}
          {step === 1 && (
            <CompanyStep data={data} patch={patch} onNext={goNext} onBack={goBack} />
          )}
          {step === 2 && (
            <BrandStep data={data} patch={patch} onNext={goNext} onBack={goBack} />
          )}
          {step === 3 && (
            <PreferencesStep data={data} patch={patch} onNext={goNext} onBack={goBack} />
          )}
          {step === 4 && (
            <DataStep
              saving={saving}
              loadingDemo={loadingDemo}
              onStartFresh={() => saveAndFinish(false)}
              onLoadDemo={() => saveAndFinish(true)}
              onBack={goBack}
            />
          )}
          {step === 5 && <DoneStep onComplete={onComplete} />}
        </div>
      </div>
      </div>{/* end inner centering wrapper */}

      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes onboardSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-6">
      {/* Logo mark */}
      <div className="relative">
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
          <LayoutDashboard size={36} className="text-primary-foreground" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <Sparkles size={12} className="text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to AutFlow Studio</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          Your agency operating system is ready. Let's spend two minutes personalizing it
          for your business so everything feels like yours from day one.
        </p>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { icon: Users, label: "Clients", desc: "CRM built for agencies" },
          { icon: FolderKanban, label: "Projects", desc: "Track every deliverable" },
          { icon: Receipt, label: "Payments", desc: "Invoices & revenue" },
        ].map(({ icon: Icon, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 border border-border"
          >
            <Icon size={18} className="text-primary" />
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{desc}</span>
          </div>
        ))}
      </div>

      <Button size="lg" onClick={onStart} className="w-full gap-2 mt-2">
        Get started
        <ArrowRight size={16} />
      </Button>

      <p className="text-[11px] text-muted-foreground">
        Takes about 2 minutes · You can change everything later in Settings
      </p>
    </div>
  );
}

// ─── Step 1: Company ──────────────────────────────────────────────────────────

function CompanyStep({
  data,
  patch,
  onNext,
  onBack,
}: {
  data: WizardData;
  patch: (u: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = data.agencyName.trim().length > 0 && data.agencyEmail.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tell us about your agency</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          This information appears on invoices and client communications.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="agencyName">
            Agency name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agencyName"
            placeholder="Acme Creative Agency"
            value={data.agencyName}
            onChange={(e) => patch({ agencyName: e.target.value })}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="agencyEmail">
            Business email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="agencyEmail"
            type="email"
            placeholder="hello@youragency.com"
            value={data.agencyEmail}
            onChange={(e) => patch({ agencyEmail: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              placeholder="https://youragency.com"
              value={data.website}
              onChange={(e) => patch({ website: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              placeholder="support@youragency.com"
              value={data.supportEmail}
              onChange={(e) => patch({ supportEmail: e.target.value })}
            />
          </div>
        </div>
      </div>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        canNext={canContinue}
        isFirst
      />
    </div>
  );
}

// ─── Step 2: Brand ────────────────────────────────────────────────────────────

function BrandStep({
  data,
  patch,
  onNext,
  onBack,
}: {
  data: WizardData;
  patch: (u: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Make it yours</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add your logo and set your default currency.
        </p>
      </div>

      <div className="space-y-5">
        <LogoUpload
          logoUrl={data.logoUrl}
          agencyName={data.agencyName}
          onUpload={(path) => patch({ logoUrl: path })}
          onClear={() => patch({ logoUrl: null })}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Select
              value={data.defaultCurrency}
              onValueChange={(v) => patch({ defaultCurrency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select
              value={data.timezone}
              onValueChange={(v) => patch({ timezone: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canNext />
    </div>
  );
}

// ─── Step 3: Preferences ──────────────────────────────────────────────────────

function PreferencesStep({
  data,
  patch,
  onNext,
  onBack,
}: {
  data: WizardData;
  patch: (u: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">How do you want to work?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set your invoicing defaults and notification preferences.
        </p>
      </div>

      <div className="space-y-5">
        {/* Invoicing */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Invoicing
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoicePrefix">Invoice prefix</Label>
              <Input
                id="invoicePrefix"
                placeholder="INV"
                value={data.invoicePrefix}
                maxLength={8}
                onChange={(e) => patch({ invoicePrefix: e.target.value.toUpperCase() })}
              />
              <p className="text-[11px] text-muted-foreground">e.g. INV-001, {data.invoicePrefix || "INV"}-001</p>
            </div>
            <div className="space-y-1.5">
              <Label>Payment terms</Label>
              <Select
                value={String(data.paymentTermsDays)}
                onValueChange={(v) => patch({ paymentTermsDays: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t.value} value={String(t.value)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Notifications
          </p>
          <div className="space-y-3">
            {[
              {
                key: "notifyInvoicePaid" as const,
                label: "Invoice paid",
                desc: "When a payment is marked as received",
              },
              {
                key: "notifyDeadlineApproaching" as const,
                label: "Deadline approaching",
                desc: "When a project or deliverable is due soon",
              },
              {
                key: "notifyWeeklyDigest" as const,
                label: "Weekly digest",
                desc: "A summary of activity every Monday",
              },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/40 border border-border"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={data[key]}
                  onCheckedChange={(v) => patch({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} canNext />
    </div>
  );
}

// ─── Step 4: Data choice ──────────────────────────────────────────────────────

function DataStep({
  saving,
  loadingDemo,
  onStartFresh,
  onLoadDemo,
  onBack,
}: {
  saving: boolean;
  loadingDemo: boolean;
  onStartFresh: () => void;
  onLoadDemo: () => void;
  onBack: () => void;
}) {
  const busy = saving || loadingDemo;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Start with sample data?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Load a realistic dataset to explore every feature before adding your own clients.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Start fresh */}
        <button
          type="button"
          disabled={busy}
          onClick={onStartFresh}
          className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && !loadingDemo && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          )}
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Sparkles size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-sm">Start fresh</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Begin with a clean workspace. Add your real clients, projects, and payments as you go.
            </p>
          </div>
        </button>

        {/* Load demo */}
        <button
          type="button"
          disabled={busy}
          onClick={onLoadDemo}
          className="group relative flex flex-col gap-3 p-4 rounded-xl border border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingDemo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/90">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading demo data…</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database size={18} className="text-primary" />
            </div>
            <span className="text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Recommended
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm">Load demo data</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Explore with 8 clients, 10 projects, invoices, tasks, meetings, and more — all realistic and ready to click through.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {["8 Clients", "10 Projects", "Invoices", "Tasks", "Meetings"].map((tag) => (
              <span
                key={tag}
                className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={busy} className="gap-1.5">
          <ArrowLeft size={14} /> Back
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Demo data can be cleared anytime from Settings → Export Data.
        </p>
      </div>
    </div>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────

function DoneStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-8 gap-6">
      <div className="relative">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/30">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          Your workspace is personalized and ready. Head to the dashboard to explore everything AutFlow Studio has to offer.
        </p>
      </div>

      <div className="w-full space-y-2">
        <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <span>Agency profile configured</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <span>Preferences saved</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <span>Notifications configured</span>
        </div>
      </div>

      <Button size="lg" onClick={onComplete} className="w-full gap-2">
        Open dashboard
        <ArrowRight size={16} />
      </Button>
    </div>
  );
}

// ─── Navigation controls ──────────────────────────────────────────────────────

function StepNav({
  onBack,
  onNext,
  canNext,
  isFirst = false,
}: {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  isFirst?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {!isFirst ? (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft size={14} /> Back
        </Button>
      ) : (
        <div />
      )}
      <Button size="sm" onClick={onNext} disabled={!canNext} className="gap-1.5">
        Continue <ArrowRight size={14} />
      </Button>
    </div>
  );
}
