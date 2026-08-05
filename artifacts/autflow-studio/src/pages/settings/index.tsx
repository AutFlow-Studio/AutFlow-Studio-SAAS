import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useAgencyProfile } from "@/components/agency-profile-provider";
import { useAuth } from "@/components/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Moon, Sun, Monitor, Loader2, Download,
  Users, Briefcase, CheckSquare, CreditCard, FolderOpen,
  Shield, Database, Camera, Upload, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgencySettingsData {
  agencyName: string;
  agencyEmail: string;
  website: string;
  supportEmail: string;
  defaultCurrency: string;
  invoicePrefix: string;
  paymentTermsDays: number;
  logoUrl: string | null;
  agencyType: string;
  teamSize: string;
  mainServices: string[];
  timezone: string;
  notifyInvoicePaid: boolean;
  notifyDeadlineApproaching: boolean;
  notifyWeeklyDigest: boolean;
}

const DEFAULT_SETTINGS: AgencySettingsData = {
  agencyName: "AutFlow Studio",
  agencyEmail: "hello@autflowstudio.com",
  website: "",
  supportEmail: "",
  defaultCurrency: "USD",
  invoicePrefix: "INV",
  paymentTermsDays: 30,
  logoUrl: null,
  agencyType: "",
  teamSize: "",
  mainServices: [],
  timezone: "UTC",
  notifyInvoicePaid: true,
  notifyDeadlineApproaching: true,
  notifyWeeklyDigest: true,
};

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

const AGENCY_TYPES = [
  { value: "marketing", label: "Marketing agency" },
  { value: "web-development", label: "Web development agency" },
  { value: "design", label: "Design agency" },
  { value: "ai-automation", label: "AI automation agency" },
  { value: "branding", label: "Branding agency" },
];

const TEAM_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "2-5", label: "2–5 people" },
  { value: "6-10", label: "6–10 people" },
  { value: "11+", label: "11+ people" },
];

const SERVICES = [
  { value: "seo-content", label: "SEO & Content" },
  { value: "paid-ads", label: "Paid Advertising" },
  { value: "social-media", label: "Social Media" },
  { value: "web-development", label: "Web Development" },
  { value: "branding", label: "Branding & Identity" },
  { value: "email-marketing", label: "Email Marketing" },
  { value: "ai-automation", label: "AI & Automation" },
  { value: "video", label: "Video Production" },
  { value: "ui-ux", label: "UI / UX Design" },
  { value: "copywriting", label: "Copywriting" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

// ── Storage helpers ────────────────────────────────────────────────────────────

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

// ── Avatar upload component ───────────────────────────────────────────────────

function AvatarUpload({
  currentUrl,
  name,
  onUpload,
}: {
  currentUrl?: string | null;
  name: string;
  onUpload: (objectPath: string) => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join("") || "?";

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Images only", description: "Please choose a PNG, JPG, or WebP file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const objectPath = await uploadToStorage(file);
      onUpload(objectPath);
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative group flex-shrink-0">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-border bg-gradient-to-tr from-primary to-accent flex items-center justify-center">
          {currentUrl ? (
            <img src={storageUrl(currentUrl)} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-white">{initials}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : (
            <Camera size={18} className="text-white" />
          )}
        </button>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 5 MB.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
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

// ── Logo upload component ─────────────────────────────────────────────────────

function LogoUpload({
  currentUrl,
  agencyName,
  onUpload,
  onRemove,
}: {
  currentUrl: string | null;
  agencyName: string;
  onUpload: (objectPath: string) => void;
  onRemove: () => void;
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
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload logo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative group w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30 overflow-hidden flex-shrink-0">
        {currentUrl ? (
          <>
            <img src={storageUrl(currentUrl)} alt={agencyName} className="w-full h-full object-contain p-1" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove logo"
            >
              <X size={10} />
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground text-center leading-tight px-1">No logo</span>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Company logo</p>
        <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 5 MB. Used on invoices and reports.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : currentUrl ? "Replace logo" : "Upload logo"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
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

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const { setProfile: setAgencyProfile } = useAgencyProfile();

  // ── Profile state ──────────────────────────────────────────────────────────
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [emailDraft, setEmailDraft] = useState(user?.email ?? "");
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(user?.avatarUrl ?? null);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setNameDraft(user?.name ?? "");
    setEmailDraft(user?.email ?? "");
    setAvatarUrlDraft(user?.avatarUrl ?? null);
  }, [user?.name, user?.email, user?.avatarUrl]);

  // ── Business settings state ────────────────────────────────────────────────
  const [settings, setSettings] = useState<AgencySettingsData>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/agency", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings({
            agencyName: data.agencyName ?? DEFAULT_SETTINGS.agencyName,
            agencyEmail: data.agencyEmail ?? DEFAULT_SETTINGS.agencyEmail,
            website: data.website ?? "",
            supportEmail: data.supportEmail ?? "",
            defaultCurrency: data.defaultCurrency ?? "USD",
            agencyType: data.agencyType ?? "",
            teamSize: data.teamSize ?? "",
            mainServices: Array.isArray(data.mainServices)
              ? data.mainServices
              : typeof data.mainServices === "string"
                ? JSON.parse(data.mainServices || "[]")
                : [],
            timezone: data.timezone ?? "UTC",
            invoicePrefix: data.invoicePrefix ?? "INV",
            paymentTermsDays: data.paymentTermsDays ?? 30,
            logoUrl: data.logoUrl ?? null,
            notifyInvoicePaid: data.notifyInvoicePaid ?? true,
            notifyDeadlineApproaching: data.notifyDeadlineApproaching ?? true,
            notifyWeeklyDigest: data.notifyWeeklyDigest ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  // ── Password change state ──────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    const name = nameDraft.trim();
    const email = emailDraft.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setProfileSaving(true);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, avatarUrl: avatarUrlDraft }),
    });
    setProfileSaving(false);
    if (res.ok) {
      await refreshUser();
      toast({ title: "Profile saved", description: "Your name, email, and photo have been updated." });
    } else {
      const body = await res.json().catch(() => ({}));
      toast({ title: "Error", description: (body as { error?: string }).error ?? "Failed to update profile.", variant: "destructive" });
    }
  };

  const handleSaveBusinessSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/settings/agency", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: settings.agencyName,
          agencyEmail: settings.agencyEmail,
          website: settings.website,
          supportEmail: settings.supportEmail,
          defaultCurrency: settings.defaultCurrency,
          agencyType: settings.agencyType || null,
          teamSize: settings.teamSize || null,
          mainServices: settings.mainServices,
          timezone: settings.timezone,
          invoicePrefix: settings.invoicePrefix,
          paymentTermsDays: settings.paymentTermsDays,
          logoUrl: settings.logoUrl,
        }),
      });
      if (res.ok) {
        await setAgencyProfile({
          agencyName: settings.agencyName,
          agencyEmail: settings.agencyEmail,
          website: settings.website,
        });
        toast({ title: "Business settings saved" });
      } else {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/settings/agency", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyInvoicePaid: settings.notifyInvoicePaid,
          notifyDeadlineApproaching: settings.notifyDeadlineApproaching,
          notifyWeeklyDigest: settings.notifyWeeklyDigest,
        }),
      });
      if (res.ok) {
        toast({ title: "Notification preferences saved" });
      } else {
        toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (newPw.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setPwSaving(false);
    if (res.ok) {
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    } else {
      const body = await res.json().catch(() => ({}));
      toast({ title: "Error", description: (body as { error?: string }).error ?? "Failed to change password.", variant: "destructive" });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader title="Workspace Settings" description="Manage your account and agency preferences" />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-card/40 backdrop-blur-sm border overflow-x-auto overflow-y-hidden mb-6">
          <TabsTrigger value="profile" className="py-2 px-4">Profile</TabsTrigger>
          <TabsTrigger value="business" className="py-2 px-4">Workspace</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2 px-4">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="py-2 px-4">Security</TabsTrigger>
          <TabsTrigger value="appearance" className="py-2 px-4">Appearance</TabsTrigger>
          <TabsTrigger value="export" className="py-2 px-4">Export Data</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6 m-0">
          <Card className="bg-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Your name, email, and profile photo shown across the workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AvatarUpload
                currentUrl={avatarUrlDraft}
                name={nameDraft || user?.name || ""}
                onUpload={(objectPath) => setAvatarUrlDraft(objectPath)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Business Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="business" className="space-y-6 m-0">
          {settingsLoading ? (
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading settings…</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
              <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>Manage the agency details used across your workspace, invoices, reports, and client-facing documents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <LogoUpload
                  currentUrl={settings.logoUrl}
                  agencyName={settings.agencyName}
                  onUpload={(objectPath) => setSettings((s) => ({ ...s, logoUrl: objectPath }))}
                  onRemove={() => setSettings((s) => ({ ...s, logoUrl: null }))}
                />

                <div className="border-t border-border/50 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {/* Agency name */}
                  <div className="space-y-2">
                     <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={settings.agencyName}
                      onChange={(e) => setSettings((s) => ({ ...s, agencyName: e.target.value }))}
                    />
                  </div>

                   {/* Agency type */}
                   <div className="space-y-2">
                     <Label htmlFor="agencyType">Agency Type</Label>
                     <Select
                       value={settings.agencyType || "unspecified"}
                       onValueChange={(v) => setSettings((s) => ({ ...s, agencyType: v === "unspecified" ? "" : v }))}
                     >
                       <SelectTrigger id="agencyType"><SelectValue placeholder="Select agency type" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="unspecified">Not specified</SelectItem>
                         {AGENCY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Team size */}
                   <div className="space-y-2">
                     <Label htmlFor="teamSize">Team Size</Label>
                     <Select
                       value={settings.teamSize || "unspecified"}
                       onValueChange={(v) => setSettings((s) => ({ ...s, teamSize: v === "unspecified" ? "" : v }))}
                     >
                       <SelectTrigger id="teamSize"><SelectValue placeholder="Select team size" /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="unspecified">Not specified</SelectItem>
                         {TEAM_SIZES.map((size) => <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Time zone */}
                   <div className="space-y-2">
                     <Label htmlFor="timezone">Time Zone</Label>
                     <Select value={settings.timezone} onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}>
                       <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         {TIMEZONES.map((zone) => <SelectItem key={zone.value} value={zone.value}>{zone.label}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>

                  {/* Default currency */}
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Select
                      value={settings.defaultCurrency}
                      onValueChange={(v) => setSettings((s) => ({ ...s, defaultCurrency: v }))}
                    >
                      <SelectTrigger id="defaultCurrency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                   {/* Services */}
                   <div className="space-y-2 sm:col-span-2">
                     <Label>Services</Label>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border/60 p-3">
                       {SERVICES.map((service) => {
                         const selected = settings.mainServices.includes(service.value);
                         return (
                           <label key={service.value} className="flex items-center gap-2 text-sm cursor-pointer">
                             <input
                               type="checkbox"
                               checked={selected}
                               onChange={(event) => setSettings((s) => ({
                                 ...s,
                                 mainServices: event.target.checked
                                   ? [...s.mainServices, service.value]
                                   : s.mainServices.filter((value) => value !== service.value),
                               }))}
                               className="h-4 w-4 rounded border-border accent-primary"
                             />
                             {service.label}
                           </label>
                         );
                       })}
                     </div>
                   </div>

                  {/* Support email */}
                  <div className="space-y-2">
                    <Label htmlFor="agencyEmail">Support Email</Label>
                    <Input
                      id="agencyEmail"
                      type="email"
                      value={settings.agencyEmail}
                      onChange={(e) => setSettings((s) => ({ ...s, agencyEmail: e.target.value }))}
                    />
                  </div>

                  {/* Website */}
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={settings.website}
                      onChange={(e) => setSettings((s) => ({ ...s, website: e.target.value }))}
                      placeholder="https://"
                    />
                  </div>

                  {/* Contact email */}
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Contact Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                      placeholder="contact@agency.com"
                    />
                  </div>

                  {/* Invoice prefix */}
                  <div className="space-y-2">
                    <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                    <Input
                      id="invoicePrefix"
                      value={settings.invoicePrefix}
                      onChange={(e) => setSettings((s) => ({ ...s, invoicePrefix: e.target.value }))}
                      placeholder="INV"
                    />
                  </div>

                  {/* Payment terms */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                    <Input
                      id="paymentTerms"
                      type="number"
                      min={0}
                      value={settings.paymentTermsDays}
                      onChange={(e) => setSettings((s) => ({ ...s, paymentTermsDays: parseInt(e.target.value, 10) || 30 }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveBusinessSettings} disabled={settingsSaving}>
                  {settingsSaving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : "Save Business Settings"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Notifications Tab ──────────────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6 m-0">
          <Card className="bg-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control which events generate notifications. Changes take effect immediately — disabling a preference suppresses future notifications of that type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Invoice Paid</Label>
                      <div className="text-sm text-muted-foreground">
                        Alert when a client payment is marked as paid
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifyInvoicePaid}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, notifyInvoicePaid: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Project Deadline Approaching</Label>
                      <div className="text-sm text-muted-foreground">
                        Alert 2 days before a project deadline is due
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifyDeadlineApproaching}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, notifyDeadlineApproaching: v }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Digest</Label>
                      <div className="text-sm text-muted-foreground">
                        Summary of your agency's activity every Monday morning
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifyWeeklyDigest}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, notifyWeeklyDigest: v }))}
                    />
                  </div>

                  <Button onClick={handleSaveNotifications} disabled={settingsSaving}>
                    {settingsSaving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : "Save Preferences"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-6 m-0">
          <Card className="bg-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your login password. Must be at least 8 characters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPw">Current Password</Label>
                <Input
                  id="currentPw"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPw">New Password</Label>
                  <Input
                    id="newPw"
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPw">Confirm New Password</Label>
                  <Input
                    id="confirmPw"
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {newPw && confirmPw && newPw !== confirmPw && (
                <p className="text-sm text-destructive">Passwords don't match</p>
              )}
              <Button
                onClick={handleChangePassword}
                disabled={pwSaving || !currentPw || !newPw || !confirmPw}
              >
                {pwSaving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance Tab ────────────────────────────────────────────────── */}
        <TabsContent value="appearance" className="space-y-6 m-0">
          <Card className="bg-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize the look and feel of your dashboard. Stored locally in this browser.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 max-w-md">
                {(["light", "dark", "system"] as const).map((t) => (
                  <div
                    key={t}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      theme === t ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                    onClick={() => setTheme(t)}
                  >
                    {t === "light" && <Sun size={24} className={theme === "light" ? "text-primary" : "text-muted-foreground"} />}
                    {t === "dark" && <Moon size={24} className={theme === "dark" ? "text-primary" : "text-muted-foreground"} />}
                    {t === "system" && <Monitor size={24} className={theme === "system" ? "text-primary" : "text-muted-foreground"} />}
                    <span className="text-sm font-medium capitalize">{t}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Export Data Tab ───────────────────────────────────────────────── */}
        <TabsContent value="export" className="space-y-6 m-0">
          {/* Trust banner */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield size={20} className="text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Your business data is always yours</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Export any part of your data at any time — no waiting, no support ticket, no lock-in.
                    Every CSV is formatted for direct import into Excel, Google Sheets, or any other tool.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={18} />
                Download Your Data
              </CardTitle>
              <CardDescription>
                Each file includes all records with related names resolved.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {([
                {
                  icon: Users,
                  iconColor: "text-blue-500",
                  iconBg: "bg-blue-500/10",
                  label: "Clients",
                  description: "Company details, contacts, contract values, status, and all client metadata.",
                  href: "/api/export/clients.csv",
                  filename: "clients.csv",
                },
                {
                  icon: Briefcase,
                  iconColor: "text-violet-500",
                  iconBg: "bg-violet-500/10",
                  label: "Projects",
                  description: "Project names, status, budgets, deadlines, revenue, and profit per project.",
                  href: "/api/export/projects.csv",
                  filename: "projects.csv",
                },
                {
                  icon: CheckSquare,
                  iconColor: "text-emerald-500",
                  iconBg: "bg-emerald-500/10",
                  label: "Tasks",
                  description: "All tasks with priority, status, deadline, and linked client and project.",
                  href: "/api/export/tasks.csv",
                  filename: "tasks.csv",
                },
                {
                  icon: CreditCard,
                  iconColor: "text-amber-500",
                  iconBg: "bg-amber-500/10",
                  label: "Invoices & Payments",
                  description: "Invoice numbers, amounts, due dates, paid dates, status, and remaining balances.",
                  href: "/api/export/invoices.csv",
                  filename: "invoices.csv",
                },
                {
                  icon: FolderOpen,
                  iconColor: "text-rose-500",
                  iconBg: "bg-rose-500/10",
                  label: "Documents",
                  description: "Document titles, types, linked clients and projects, and external URLs.",
                  href: "/api/export/documents.csv",
                  filename: "documents.csv",
                },
              ] as const).map(({ icon: Icon, iconColor, iconBg, label, description, href, filename }) => (
                <div key={filename} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                  </div>
                  <a href={href} download={filename} className="flex-shrink-0">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download size={14} />
                      Download CSV
                    </Button>
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
