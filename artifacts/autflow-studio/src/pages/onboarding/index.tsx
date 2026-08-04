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
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  X,
  Briefcase,
  Check,
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
  agencyType: string;
  teamSize: string;
  mainServices: string[];
  activeClientCount: string;
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

// ─── Agency setup constants ────────────────────────────────────────────────────

const AGENCY_TYPES: { id: string; label: string; description: string; icon: string }[] = [
  { id: "marketing",       label: "Marketing Agency",       description: "SEO, paid ads, social media & content", icon: "📣" },
  { id: "web-development", label: "Web Development Agency", description: "Websites, apps & technical builds",      icon: "💻" },
  { id: "design",          label: "Design Agency",          description: "Branding, UI/UX & creative work",        icon: "🎨" },
  { id: "ai-automation",   label: "AI Automation Agency",   description: "AI workflows, bots & integrations",      icon: "🤖" },
  { id: "branding",        label: "Branding Agency",        description: "Brand identity, strategy & positioning", icon: "✨" },
];

const TEAM_SIZES: { id: string; label: string; sub: string }[] = [
  { id: "solo",  label: "Just me",      sub: "Solo founder" },
  { id: "2-5",   label: "2 – 5",        sub: "Small team" },
  { id: "6-10",  label: "6 – 10",       sub: "Growing team" },
  { id: "11+",   label: "11+",          sub: "Established agency" },
];

const MAIN_SERVICES: { id: string; label: string }[] = [
  { id: "seo-content",     label: "SEO & Content" },
  { id: "paid-ads",        label: "Paid Advertising" },
  { id: "social-media",    label: "Social Media" },
  { id: "web-development", label: "Web Development" },
  { id: "branding",        label: "Branding & Identity" },
  { id: "email-marketing", label: "Email Marketing" },
  { id: "ai-automation",   label: "AI & Automation" },
  { id: "video",           label: "Video Production" },
  { id: "ui-ux",           label: "UI / UX Design" },
  { id: "copywriting",     label: "Copywriting" },
];

const ACTIVE_CLIENT_COUNTS: { id: string; label: string; sub: string }[] = [
  { id: "0",     label: "0",    sub: "Just starting" },
  { id: "1-5",   label: "1–5",  sub: "Getting going" },
  { id: "6-15",  label: "6–15", sub: "Growing" },
  { id: "16-30", label: "16–30",sub: "Established" },
  { id: "30+",   label: "30+",  sub: "Scaling" },
];

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
  { icon: Briefcase, label: "Agency" },
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
    agencyType: "",
    teamSize: "",
    mainServices: [],
    activeClientCount: "",
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

  // Save all settings
  async function saveAndFinish() {
    setSaving(true);
    try {
      const settingsRes = await fetch("/api/settings/agency", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          onboardingCompleted: true,
          businessType: "digital-agency",
          mainServices: data.mainServices,
          activeClientCount: data.activeClientCount,
        }),
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

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
            <AgencySetupStep
              data={data}
              patch={patch}
              saving={saving}
              onConfirm={saveAndFinish}
              onBack={goBack}
            />
          )}
          {step === 5 && <DoneStep onComplete={onComplete} agencyName={data.agencyName} agencyType={data.agencyType} />}
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

// ─── Step 4: Agency setup ─────────────────────────────────────────────────────

function AgencySetupStep({
  data,
  patch,
  saving,
  onConfirm,
  onBack,
}: {
  data: WizardData;
  patch: (u: Partial<WizardData>) => void;
  saving: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const canConfirm = data.agencyType.length > 0 && data.teamSize.length > 0;

  function toggleService(id: string) {
    const current = data.mainServices;
    patch({
      mainServices: current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id],
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Tell us about your agency</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          This helps personalise your workspace and AI assistant.
        </p>
      </div>

      {/* Agency type */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What type of agency do you run?
        </p>
        <div className="grid grid-cols-1 gap-2">
          {AGENCY_TYPES.map((type) => {
            const isSelected = data.agencyType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                disabled={saving}
                onClick={() => patch({ agencyType: type.id })}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 disabled:opacity-50
                  ${isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  }`}
              >
                <span className="text-lg leading-none flex-shrink-0">{type.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{type.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{type.description}</p>
                </div>
                {isSelected && (
                  <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Team size */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How many people are on your team?
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TEAM_SIZES.map((size) => {
            const isSelected = data.teamSize === size.id;
            return (
              <button
                key={size.id}
                type="button"
                disabled={saving}
                onClick={() => patch({ teamSize: size.id })}
                className={`flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border text-center transition-all duration-150 disabled:opacity-50
                  ${isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  }`}
              >
                <span className="text-sm font-bold">{size.label}</span>
                <span className="text-[10px] text-muted-foreground">{size.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main services */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Main services <span className="font-normal normal-case text-muted-foreground/60">(pick all that apply)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {MAIN_SERVICES.map((svc) => {
            const isSelected = data.mainServices.includes(svc.id);
            return (
              <button
                key={svc.id}
                type="button"
                disabled={saving}
                onClick={() => toggleService(svc.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 disabled:opacity-50
                  ${isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
              >
                {isSelected && <Check size={10} className="inline mr-1" />}
                {svc.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active client count */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How many active clients do you have now?
        </p>
        <div className="grid grid-cols-5 gap-2">
          {ACTIVE_CLIENT_COUNTS.map((c) => {
            const isSelected = data.activeClientCount === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={saving}
                onClick={() => patch({ activeClientCount: c.id })}
                className={`flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl border text-center transition-all duration-150 disabled:opacity-50
                  ${isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                  }`}
              >
                <span className="text-sm font-bold">{c.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{c.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={saving} className="gap-1.5">
          <ArrowLeft size={14} /> Back
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={saving || !canConfirm}
          className="gap-1.5 min-w-[140px]"
        >
          {saving ? (
            <><Loader2 size={13} className="animate-spin" /> Saving…</>
          ) : (
            <><Sparkles size={13} /> Launch my workspace</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────

function DoneStep({
  onComplete,
  agencyName,
  agencyType,
}: {
  onComplete: () => void;
  agencyName: string;
  agencyType: string;
}) {
  const typeLabel = AGENCY_TYPES.find((t) => t.id === agencyType)?.label ?? "Digital Agency";

  return (
    <div className="flex flex-col items-center text-center py-8 gap-6">
      <div className="relative">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/30">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Your workspace is ready</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          {agencyName
            ? `${agencyName} is configured as a ${typeLabel}. Add your first client to get started.`
            : `Your ${typeLabel} workspace is configured. Add your first client to get started.`}
        </p>
      </div>

      <div className="w-full space-y-2">
        {[
          "Agency profile configured",
          "Invoicing preferences saved",
          "AI assistant ready for your workspace",
          "Client portal enabled",
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
            <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <Button size="lg" onClick={onComplete} className="w-full gap-2">
        Open Agency Dashboard
        <ArrowRight size={16} />
      </Button>

      <p className="text-[11px] text-muted-foreground -mt-3">
        Everything can be changed later in Settings
      </p>
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
