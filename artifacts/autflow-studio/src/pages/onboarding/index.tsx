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
  LayoutTemplate,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  Users,
  FolderKanban,
  Receipt,
  X,
  Briefcase,
  Heart,
  Laptop,
  Check,
  Wand2,
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
  { icon: LayoutTemplate, label: "Template" },
];

// ─── Template definitions (mirrors backend TEMPLATE_META) ─────────────────────

type TemplateColor = "violet" | "blue" | "rose" | "amber" | "emerald";

const TEMPLATES: {
  id: string;
  name: string;
  tagline: string;
  icon: React.ElementType;
  color: TemplateColor;
  includes: string[];
}[] = [
  {
    id: "digital-agency",
    name: "Digital Agency",
    tagline: "Clients, projects & campaigns",
    icon: Palette,
    color: "violet",
    includes: ["4 active retainer clients", "5 branding & web projects", "Deliverables, invoices & tasks", "Meeting logs & notes"],
  },
  {
    id: "consulting",
    name: "Consulting Business",
    tagline: "Engagements, reports & advisory",
    icon: Briefcase,
    color: "blue",
    includes: ["4 enterprise advisory clients", "5 consulting engagements", "Board-ready deliverables", "Invoices & follow-up tasks"],
  },
  {
    id: "clinic",
    name: "Clinic / Healthcare",
    tagline: "Appointments & revenue tracking",
    icon: Heart,
    color: "rose",
    includes: ["4 client partners & cohorts", "Program-based workflows", "Follow-up tasks & care notes", "Session billing & payments"],
  },
  {
    id: "freelancer",
    name: "Freelancer",
    tagline: "Projects, invoices & client comms",
    icon: Laptop,
    color: "amber",
    includes: ["3 active freelance clients", "4 design & web projects", "Task lists & deadlines", "Project invoices & payments"],
  },
  {
    id: "generic",
    name: "Generic Business",
    tagline: "A starting point for any service business",
    icon: Building2,
    color: "emerald",
    includes: ["4 clients across industries", "5 varied service projects", "Full activity & doc library", "Meetings, payments & tasks"],
  },
];

const COLOR_CLASSES: Record<TemplateColor, { icon: string; ring: string; badge: string }> = {
  violet: { icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", ring: "ring-violet-400", badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  blue:   { icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",       ring: "ring-blue-400",   badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  rose:   { icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",       ring: "ring-rose-400",   badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  amber:  { icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",    ring: "ring-amber-400",  badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  emerald:{ icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
};

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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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

  // Save all settings and optionally apply a business template
  async function saveAndFinish(templateId: string | null) {
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

      // Apply the selected template if one was chosen
      if (templateId) {
        setLoadingDemo(true);
        const tplRes = await fetch("/api/templates/apply", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        setLoadingDemo(false);
        if (!tplRes.ok) {
          toast({
            title: "Template couldn't load",
            description: "Your settings were saved. You can add data later from Settings.",
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
            <TemplateStep
              saving={saving}
              loadingDemo={loadingDemo}
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
              onConfirm={() => saveAndFinish(selectedTemplate)}
              onBack={goBack}
            />
          )}
          {step === 5 && <DoneStep onComplete={onComplete} appliedTemplate={selectedTemplate} />}
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

// ─── Step 4: Template picker ──────────────────────────────────────────────────

function TemplateStep({
  saving,
  loadingDemo,
  selectedTemplate,
  onSelect,
  onConfirm,
  onBack,
}: {
  saving: boolean;
  loadingDemo: boolean;
  selectedTemplate: string | null;
  onSelect: (id: string | null) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const busy = saving || loadingDemo;
  const chosen = selectedTemplate
    ? TEMPLATES.find((t) => t.id === selectedTemplate) ?? null
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Choose a business template</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Start with realistic sample data tailored to your industry — or jump in with a blank workspace.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => {
          const cls = COLOR_CLASSES[tpl.color];
          const isSelected = selectedTemplate === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={busy}
              onClick={() => onSelect(isSelected ? null : tpl.id)}
              className={`relative flex flex-col gap-2.5 p-3.5 rounded-xl border text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                ${isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={11} className="text-primary-foreground" />
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cls.icon}`}>
                  <tpl.icon size={15} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{tpl.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{tpl.tagline}</p>
                </div>
              </div>

              {/* Includes list */}
              <ul className="space-y-1">
                {tpl.includes.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Check size={10} className="mt-0.5 flex-shrink-0 text-primary/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}

        {/* Start fresh option */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect(null)}
          className={`relative flex flex-col gap-2.5 p-3.5 rounded-xl border text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed sm:col-span-2
            ${selectedTemplate === null && !busy
              ? "border-dashed border-primary/40 bg-primary/3 ring-1 ring-primary/20"
              : "border-dashed border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
            }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Start with a blank workspace</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Skip the sample data — I'll add my own clients and projects from scratch.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={busy} className="gap-1.5">
          <ArrowLeft size={14} /> Back
        </Button>

        <Button
          size="sm"
          onClick={onConfirm}
          disabled={busy}
          className="gap-1.5 min-w-[160px]"
        >
          {busy ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              {loadingDemo ? "Applying template…" : "Saving…"}
            </>
          ) : chosen ? (
            <>
              <Wand2 size={13} />
              Apply {chosen.name}
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Start fresh
            </>
          )}
        </Button>
      </div>

      {chosen && (
        <p className="text-[11px] text-muted-foreground text-center -mt-2">
          Sample data can be cleared anytime from Settings → Data Management.
        </p>
      )}
    </div>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────

function DoneStep({
  onComplete,
  appliedTemplate,
}: {
  onComplete: () => void;
  appliedTemplate: string | null;
}) {
  const tpl = appliedTemplate ? TEMPLATES.find((t) => t.id === appliedTemplate) ?? null : null;

  return (
    <div className="flex flex-col items-center text-center py-8 gap-6">
      <div className="relative">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/30">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
          {tpl
            ? `Your workspace is loaded with the ${tpl.name} template. Everything is ready to customize.`
            : "Your workspace is configured and ready. Start adding your clients and projects whenever you are."}
        </p>
      </div>

      <div className="w-full space-y-2">
        <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <span>Business profile configured</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
          <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
          <span>Preferences & notifications saved</span>
        </div>
        {tpl ? (
          <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
            <tpl.icon size={15} className="text-primary flex-shrink-0" />
            <span><span className="font-medium">{tpl.name}</span> template applied — {tpl.includes[0].toLowerCase()}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-left px-4 py-3 rounded-lg bg-muted/50 border border-border">
            <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
            <span>Clean workspace — ready for your real data</span>
          </div>
        )}
      </div>

      <Button size="lg" onClick={onComplete} className="w-full gap-2">
        Open dashboard
        <ArrowRight size={16} />
      </Button>

      {tpl && (
        <p className="text-[11px] text-muted-foreground -mt-3">
          All sample data can be cleared anytime from Settings → Data Management.
        </p>
      )}
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
