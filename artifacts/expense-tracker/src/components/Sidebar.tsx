import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, PiggyBank, LogOut, Flame, Repeat, Target, Sparkles } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/recurring", label: "Rituals", icon: Repeat },
    { href: "/budget", label: "Budget", icon: PiggyBank },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/coach", label: "Ask Ember", icon: Sparkles },
  ];

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}` 
    : user?.email ? user.email[0].toUpperCase() : "?";

  const displayName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : "My Account";

  return (
    <aside className="w-72 border-r border-border bg-card hidden md:flex flex-col">
      <div className="h-20 flex items-center px-8 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:shadow-md transition-all">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <span className="font-serif font-bold text-2xl tracking-tight text-foreground">
            Ember
          </span>
        </Link>
      </div>
      
      <nav className="flex-1 py-8 px-4 space-y-2">
        <div className="px-4 mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Menu</div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer font-medium",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-border/50">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2" title="Log out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/recurring", label: "Rituals", icon: Repeat },
    { href: "/budget", label: "Budget", icon: PiggyBank },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/coach", label: "Ask Ember", icon: Sparkles },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-md border-t border-border z-40 px-6 py-3 flex justify-between items-center pb-safe">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;
        return (
          <Link key={link.href} href={link.href} className="flex-1 flex flex-col items-center justify-center p-2 relative">
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full shadow-[0_2px_8px_rgba(var(--primary),0.5)]" />
            )}
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all mt-1",
                isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-wide">{link.label}</span>
            </div>
          </Link>
        );
      })}
      <button
        onClick={logout}
        data-testid="button-logout-mobile"
        className="flex-1 flex flex-col items-center justify-center p-2 relative"
      >
        <div className="flex flex-col items-center justify-center gap-1 transition-all mt-1 text-muted-foreground hover:text-destructive">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] tracking-wide">Log out</span>
        </div>
      </button>
    </div>
  );
}