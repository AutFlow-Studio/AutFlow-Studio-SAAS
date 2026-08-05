import { useState } from "react";
import { getAvatarColor } from "@/lib/avatar-color";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCog,
  Users,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Edit,
  Trash2,
  Activity,
  UserPlus,
  Eye,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  phone: string | null;
  status: "active" | "inactive";
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  activeProjects: number;
  availability: "available" | "busy" | "overloaded";
}

interface TeamSummary {
  totalMembers: number;
  activeMembers: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  activeProjects: number;
}

interface TeamData {
  members: TeamMember[];
  summary: TeamSummary;
}

interface MemberFormState {
  name: string;
  email: string;
  password: string;
  role: string;
  jobTitle: string;
  phone: string;
  status: "active" | "inactive";
  avatarUrl: string;
}

const EMPTY_FORM: MemberFormState = {
  name: "",
  email: "",
  password: "",
  role: "member",
  jobTitle: "",
  phone: "",
  status: "active",
  avatarUrl: "",
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_ROLES = [
  { value: "owner",   label: "Owner" },
  { value: "admin",   label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "member",  label: "Member" },
  // Legacy roles — kept for display compatibility
  { value: "designer",          label: "Designer" },
  { value: "developer",         label: "Developer" },
  { value: "copywriter",        label: "Copywriter" },
  { value: "media_buyer",       label: "Media Buyer" },
  { value: "strategist",        label: "Strategist" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
];

const FORM_ROLES = TEAM_ROLES.slice(0, 4); // Only show Owner/Admin/Manager/Member in forms

function getRoleLabel(role: string) {
  return TEAM_ROLES.find((r) => r.value === role)?.label ?? role;
}

function getRoleColor(role: string) {
  switch (role) {
    case "owner":   return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "admin":   return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "manager": return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "designer":  return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    case "developer": return "bg-green-500/15 text-green-600 dark:text-green-400";
    case "copywriter": return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "media_buyer": return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "strategist": return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    case "virtual_assistant": return "bg-teal-500/15 text-teal-600 dark:text-teal-400";
    default: return "bg-secondary text-muted-foreground";
  }
}

function getWorkloadBadgeColor(tasks: number, inProgress: number) {
  if (inProgress > 5 || tasks > 10)
    return "bg-red-500/15 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400";
  if (inProgress > 3 || tasks > 6)
    return "bg-yellow-500/15 text-yellow-600 border-yellow-200 dark:border-yellow-800 dark:text-yellow-400";
  return "bg-green-500/15 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400";
}

function getWorkloadLabel(tasks: number, inProgress: number) {
  if (inProgress > 5 || tasks > 10) return "Overloaded";
  if (inProgress > 3 || tasks > 6)  return "Busy";
  return "Available";
}

function MemberAvatar({ member, size = "md" }: { member: Pick<TeamMember, "name" | "avatarUrl">; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  const initials = member.name.split(/\s+/).filter(Boolean).map((p) => p[0]!.toUpperCase()).slice(0, 2).join("");
  const avatarColor = getAvatarColor(member.name);
  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl.startsWith("/api/") ? member.avatarUrl : `/api/storage${member.avatarUrl}`}
        alt={member.name}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass)}
      />
    );
  }
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold flex-shrink-0", sizeClass)}
      style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
    >
      {initials || "?"}
    </div>
  );
}

// ── Member Form Dialog (Add / Edit) ───────────────────────────────────────────

function MemberFormDialog({
  member,
  onClose,
  onSaved,
}: {
  member: TeamMember | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!member;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<MemberFormState>(
    isEdit
      ? {
          name: member.name,
          email: member.email,
          password: "",
          role: member.role,
          jobTitle: member.jobTitle ?? "",
          phone: member.phone ?? "",
          status: member.status,
          avatarUrl: member.avatarUrl ?? "",
        }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof MemberFormState, string>>>({});

  function set<K extends keyof MemberFormState>(key: K, value: MemberFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof MemberFormState, string>> = {};
    if (!form.name.trim())  e.name  = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!isEdit && !form.password.trim()) e.password = "Temporary password is required";
    if (!isEdit && form.password && form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (!form.role) e.role = "Role is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: "Team member added" });
      onSaved();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(`/api/team/${member!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: "Team member updated" });
      onSaved();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!validate()) return;
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      jobTitle: form.jobTitle.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status,
      avatarUrl: form.avatarUrl.trim() || null,
      ...(!isEdit && { password: form.password }),
    };
    if (isEdit) updateMutation.mutate(body);
    else createMutation.mutate(body);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit — ${member.name}` : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this team member's profile and access level." : "Add a new member to your workspace."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Maya Chen"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="maya@agency.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Password (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min. 6 characters"
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              <p className="text-[11px] text-muted-foreground">The member can change this after their first login.</p>
            </div>
          )}

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role <span className="text-destructive">*</span></Label>
            <Select value={form.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input
              value={form.jobTitle}
              onChange={(e) => set("jobTitle", e.target.value)}
              placeholder="e.g. Senior Designer"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <Label>Avatar URL</Label>
            <Input
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add Member")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── View Profile Dialog ────────────────────────────────────────────────────────

function ViewProfileDialog({ member, onClose, onEdit }: { member: TeamMember; onClose: () => void; onEdit: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <MemberAvatar member={member} size="lg" />
            <div>
              <div className="font-semibold text-base">{member.name}</div>
              {member.jobTitle && <div className="text-sm text-muted-foreground">{member.jobTitle}</div>}
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block", getRoleColor(member.role))}>
                {getRoleLabel(member.role)}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail size={13} />
              <span className="text-foreground">{member.email}</span>
            </div>
            {member.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone size={13} />
                <span className="text-foreground">{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck size={13} />
              <span className={cn("font-medium", member.status === "active" ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                {member.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={13} />
              <span className="text-foreground">Joined {format(new Date(member.createdAt), "MMM d, yyyy")}</span>
            </div>
            {member.lastLoginAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity size={13} />
                <span className="text-foreground">Last active {format(new Date(member.lastLoginAt), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-secondary/50 p-2">
              <div className="text-lg font-bold">{member.tasksAssigned}</div>
              <div className="text-[10px] text-muted-foreground">Tasks</div>
            </div>
            <div className="rounded-md bg-secondary/50 p-2">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{member.tasksInProgress}</div>
              <div className="text-[10px] text-muted-foreground">In Progress</div>
            </div>
            <div className="rounded-md bg-secondary/50 p-2">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">{member.tasksCompleted}</div>
              <div className="text-[10px] text-muted-foreground">Done</div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={onEdit}>Edit Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TeamView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen,     setAddOpen]     = useState(false);
  const [editMember,  setEditMember]  = useState<TeamMember | null>(null);
  const [viewMember,  setViewMember]  = useState<TeamMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/team"],
    queryFn: async () => {
      const res = await fetch("/api/team", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  const members = data?.members ?? [];
  const summary = data?.summary;

  // ── Status toggle mutation ────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "active" | "inactive" }) => {
      const res = await fetch(`/api/team/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update status");
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      toast({ title: vars.status === "active" ? "Member activated" : "Member deactivated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/team/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete member");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setDeleteMember(null);
      toast({ title: "Team member removed" });
    },
    onError: (err: Error) => {
      setDeleteMember(null);
      toast({ title: "Cannot delete", description: err.message, variant: "destructive" });
    },
  });

  const overloadedCount = members.filter((m) => m.tasksInProgress > 5 || m.tasksAssigned > 10).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your team, track roles, and monitor workload across all active projects."
      >
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <UserPlus size={15} />
          Add Team Member
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-primary" />
                <span className="text-sm text-muted-foreground">Team Size</span>
              </div>
              <div className="text-2xl font-bold">{summary.totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={16} className="text-blue-500" />
                <span className="text-sm text-muted-foreground">Active Projects</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.activeProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-sm text-muted-foreground">Active Members</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.activeMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-red-500" />
                <span className="text-sm text-muted-foreground">Overloaded</span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overloadedCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workload warning */}
      {overloadedCount > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Workload risk detected</p>
              <p className="text-xs text-muted-foreground">
                {overloadedCount} team member{overloadedCount > 1 ? "s are" : " is"} overloaded. Consider redistributing tasks.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <UserCog size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-4">
            Add your designers, developers, and strategists to start tracking workload and collaboration.
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus size={15} />
            Add First Member
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const workloadBadge = getWorkloadBadgeColor(member.tasksAssigned, member.tasksInProgress);
            const workloadLabel = getWorkloadLabel(member.tasksAssigned, member.tasksInProgress);
            const isInactive = member.status === "inactive";

            return (
              <Card
                key={member.id}
                className={cn("hover:shadow-md transition-shadow", isInactive && "opacity-60")}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar member={member} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{member.name}</div>
                        {member.jobTitle && (
                          <div className="text-xs text-muted-foreground truncate">{member.jobTitle}</div>
                        )}
                        <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewMember(member)} className="gap-2">
                          <Eye size={13} /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditMember(member)} className="gap-2">
                          <Edit size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {isInactive ? (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: member.id, status: "active" })}
                            className="gap-2 text-green-600 focus:text-green-600"
                          >
                            <UserCheck size={13} /> Activate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => statusMutation.mutate({ id: member.id, status: "inactive" })}
                            className="gap-2 text-yellow-600 focus:text-yellow-600"
                            disabled={member.role === "owner"}
                          >
                            <UserX size={13} /> Deactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteMember(member)}
                          className="gap-2 text-destructive focus:text-destructive"
                          disabled={member.role === "owner"}
                        >
                          <Trash2 size={13} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getRoleColor(member.role))}>
                      {getRoleLabel(member.role)}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", workloadBadge)}>
                      {workloadLabel}
                    </span>
                    {isInactive && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-secondary/50 p-2">
                      <div className="text-lg font-bold">{member.tasksAssigned}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">Tasks</div>
                    </div>
                    <div className="rounded-md bg-secondary/50 p-2">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{member.tasksInProgress}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">In Progress</div>
                    </div>
                    <div className="rounded-md bg-secondary/50 p-2">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">{member.tasksCompleted}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">Done</div>
                    </div>
                  </div>

                  {member.lastLoginAt && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Activity size={11} />
                      Last active {format(new Date(member.lastLoginAt), "MMM d")}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      {addOpen && (
        <MemberFormDialog
          member={null}
          onClose={() => setAddOpen(false)}
          onSaved={() => setAddOpen(false)}
        />
      )}

      {/* Edit Dialog */}
      {editMember && (
        <MemberFormDialog
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); setViewMember(null); }}
        />
      )}

      {/* View Profile Dialog */}
      {viewMember && !editMember && (
        <ViewProfileDialog
          member={members.find((m) => m.id === viewMember.id) ?? viewMember}
          onClose={() => setViewMember(null)}
          onEdit={() => { setEditMember(viewMember); setViewMember(null); }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteMember && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteMember(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {deleteMember.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{deleteMember.name}</strong> from your workspace. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteMember.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Removing..." : "Remove Member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
