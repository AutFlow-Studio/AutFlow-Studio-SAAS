import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCog,
  Users,
  Briefcase,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  MoreHorizontal,
  Edit,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
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
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  activeProjects: number;
}

interface TeamData {
  members: TeamMember[];
  summary: TeamSummary;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "designer", label: "Designer" },
  { value: "developer", label: "Developer" },
  { value: "copywriter", label: "Copywriter" },
  { value: "media_buyer", label: "Media Buyer" },
  { value: "strategist", label: "Strategist" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
  { value: "member", label: "Member" },
];

function getRoleLabel(role: string) {
  return TEAM_ROLES.find((r) => r.value === role)?.label ?? role;
}

function getRoleColor(role: string) {
  switch (role) {
    case "owner": return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "manager": return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "designer": return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    case "developer": return "bg-green-500/15 text-green-600 dark:text-green-400";
    case "copywriter": return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "media_buyer": return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "strategist": return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    case "virtual_assistant": return "bg-teal-500/15 text-teal-600 dark:text-teal-400";
    default: return "bg-secondary text-muted-foreground";
  }
}

function getWorkloadColor(tasks: number, inProgress: number) {
  if (inProgress > 5 || tasks > 10) return "text-red-500";
  if (inProgress > 3 || tasks > 6) return "text-yellow-500";
  return "text-green-500";
}

function getWorkloadLabel(tasks: number, inProgress: number) {
  if (inProgress > 5 || tasks > 10) return "Overloaded";
  if (inProgress > 3 || tasks > 6) return "Busy";
  return "Available";
}

function getWorkloadBadgeColor(tasks: number, inProgress: number) {
  if (inProgress > 5 || tasks > 10) return "bg-red-500/15 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400";
  if (inProgress > 3 || tasks > 6) return "bg-yellow-500/15 text-yellow-600 border-yellow-200 dark:border-yellow-800 dark:text-yellow-400";
  return "bg-green-500/15 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400";
}

function MemberInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
      {initials || "?"}
    </div>
  );
}

// ── Edit Role Dialog ───────────────────────────────────────────────────────────

function EditRoleDialog({
  member,
  onClose,
  onSave,
  isPending,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (role: string) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState(member.role);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role — {member.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(role)} disabled={isPending || role === member.role}>
            {isPending ? "Saving..." : "Save Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TeamView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await fetch(`/api/team/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
      setEditMember(null);
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update role.", variant: "destructive" }),
  });

  const overloadedCount = members.filter((m) => m.tasksInProgress > 5 || m.tasksAssigned > 10).length;
  const availableCount = members.filter((m) => m.tasksInProgress <= 3 && m.tasksAssigned <= 6).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your team, track roles, and monitor workload across all active projects."
      />

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
                <span className="text-sm text-muted-foreground">Available</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{availableCount}</div>
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

      {/* Workload Overview Banner */}
      {overloadedCount > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Workload risk detected</p>
              <p className="text-xs text-muted-foreground">
                {overloadedCount} team member{overloadedCount > 1 ? "s are" : " is"} overloaded. Consider redistributing tasks to avoid burnout and missed deadlines.
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
          <p className="text-muted-foreground text-sm max-w-sm">
            Team members appear here once they've signed up and been added to your workspace. Invite your designers, developers, and strategists to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const workloadColor = getWorkloadColor(member.tasksAssigned, member.tasksInProgress);
            const workloadLabel = getWorkloadLabel(member.tasksAssigned, member.tasksInProgress);
            const workloadBadge = getWorkloadBadgeColor(member.tasksAssigned, member.tasksInProgress);
            return (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img src={`/api/storage${member.avatarUrl}`} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <MemberInitials name={member.name} />
                      )}
                      <div>
                        <div className="font-semibold text-sm">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditMember(member)} className="gap-2">
                          <Edit size={13} />
                          Change Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getRoleColor(member.role))}>
                      {getRoleLabel(member.role)}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", workloadBadge)}>
                      {workloadLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
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

      {/* Edit Role Dialog */}
      {editMember && (
        <EditRoleDialog
          member={editMember}
          onClose={() => setEditMember(null)}
          onSave={(role) => updateRoleMutation.mutate({ id: editMember.id, role })}
          isPending={updateRoleMutation.isPending}
        />
      )}
    </div>
  );
}
