import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { usePortalAuth } from "@/components/portal-auth-provider";
import {
  LayoutDashboard,
  Briefcase,
  Files,
  CreditCard,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Command,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/projects", label: "Projects", icon: Briefcase },
  { href: "/portal/documents", label: "Documents", icon: Files },
  { href: "/portal/payments", label: "Invoices", icon: CreditCard },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = usePortalAuth();
  const { toast } = useToast();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = (user?.name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!.toUpperCase())
    .slice(0, 2)
    .join("") || "?";

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return location === item.href;
    return location.startsWith(item.href);
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 border-r border-border/50 bg-card/95 backdrop-blur-xl flex flex-col z-40 transition-transform duration-300 md:hidden",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/50">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Command size={14} />
            </div>
            <span>Client Portal</span>
          </div>
          <button type="button" onClick={() => setMobileNavOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <div className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive(item)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <item.icon size={16} className={cn(isActive(item) ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/50 backdrop-blur-xl flex flex-col flex-shrink-0 z-20 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Command size={14} />
            </div>
            <span>Client Portal</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          <div className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Navigation</div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                isActive(item)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              <item.icon size={16} className={cn(isActive(item) ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Client Portal</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-xs font-bold text-white ring-2 ring-background">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.name ?? ""}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email ?? ""}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={async () => {
                  await logout();
                  toast({ title: "Signed out", description: "You have been signed out of the client portal." });
                }}
              >
                <LogOut size={14} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
