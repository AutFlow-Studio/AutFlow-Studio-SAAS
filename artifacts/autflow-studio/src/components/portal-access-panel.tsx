import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, RefreshCw, ExternalLink, UserCog, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface PortalUser {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PortalAccessPanelProps {
  clientId: number;
}

export function PortalAccessPanel({ clientId }: PortalAccessPanelProps) {
  const { toast } = useToast();
  const [portalUser, setPortalUser] = useState<PortalUser | null | undefined>(undefined); // undefined = loading
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const fetchPortalUser = useCallback(() => {
    fetch(`/api/portal-admin/clients/${clientId}/access`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPortalUser)
      .catch(() => setPortalUser(null));
  }, [clientId]);

  useEffect(() => { fetchPortalUser(); }, [fetchPortalUser]);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/portal-admin/clients/${clientId}/access`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to grant access");
      }
      const user = await res.json();
      setPortalUser(user);
      setGrantOpen(false);
      setForm({ name: "", email: "", password: "" });
      toast({ title: "Portal access granted", description: `${user.name} can now log in at /portal` });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to grant access", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!portalUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/portal-admin/clients/${clientId}/access`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !portalUser.isActive }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setPortalUser(updated);
      toast({ title: updated.isActive ? "Access re-enabled" : "Access suspended" });
    } catch {
      toast({ title: "Error", description: "Failed to update access", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    setSaving(true);
    try {
      await fetch(`/api/portal-admin/clients/${clientId}/access`, {
        method: "DELETE",
        credentials: "include",
      });
      setPortalUser(null);
      setRevokeOpen(false);
      toast({ title: "Portal access revoked" });
    } catch {
      toast({ title: "Error", description: "Failed to revoke access", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (portalUser === undefined) {
    return (
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardContent className="py-10 text-center text-muted-foreground text-sm">Loading…</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/40 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Client Portal Access</CardTitle>
            <CardDescription>
              Give this client a secure login to view their projects, invoices, and documents.
            </CardDescription>
          </div>
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Preview portal <ExternalLink size={12} />
          </a>
        </CardHeader>

        <CardContent>
          {!portalUser ? (
            <div className="flex flex-col items-center gap-4 py-8 border border-dashed border-border/50 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ShieldOff size={20} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">No portal access yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grant this client login credentials to access their portal.
                </p>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setGrantOpen(true)}>
                <ShieldCheck size={15} />
                Grant Portal Access
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <UserCog size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{portalUser.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        portalUser.isActive
                          ? "border-emerald-500/40 text-emerald-400"
                          : "border-red-500/40 text-red-400"
                      )}
                    >
                      {portalUser.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{portalUser.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {portalUser.lastLoginAt
                      ? `Last login: ${format(parseISO(portalUser.lastLoginAt), "MMM d, yyyy 'at' h:mm a")}`
                      : "Never logged in"}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setGrantOpen(true)}>
                  <RefreshCw size={14} />
                  Update Credentials
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("gap-2", portalUser.isActive ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300")}
                  onClick={handleToggleActive}
                  disabled={saving}
                >
                  {portalUser.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  {portalUser.isActive ? "Suspend Access" : "Re-enable Access"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => setRevokeOpen(true)}
                >
                  <Trash2 size={14} />
                  Revoke Access
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <strong>Portal URL:</strong> <code className="font-mono">/portal</code> — share this with your client along with their email and password.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant / Update Credentials Dialog */}
      <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{portalUser ? "Update Portal Credentials" : "Grant Portal Access"}</DialogTitle>
            <DialogDescription>
              {portalUser
                ? "Update the login credentials for this client's portal account."
                : "Create a portal account for this client. Share the email and password with them securely."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGrant} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-name">Contact Name</Label>
              <Input
                id="portal-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email Address</Label>
              <Input
                id="portal-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@client.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-password">Password</Label>
              <Input
                id="portal-password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
              <p className="text-xs text-muted-foreground">Share this password with your client securely (e.g. via a password manager or encrypted message).</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGrantOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : portalUser ? "Update Credentials" : "Grant Access"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Portal Access</DialogTitle>
            <DialogDescription>
              This will permanently delete {portalUser?.name}'s portal account. They will no longer be able to log in.
              You can re-grant access at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={saving}>
              {saving ? "Revoking…" : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
