import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, PiggyBank, Activity } from "lucide-react";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: false } });

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/budget", label: "Budget", icon: PiggyBank },
  ];

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
            S
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-foreground">
            SpendWise
          </span>
        </div>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Activity className={cn("w-3 h-3", health?.status === "ok" ? "text-success" : "text-muted-foreground")} />
          <span>{health?.status === "ok" ? "System online" : "Checking status..."}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Stay on top of your daily spending.
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/budget", label: "Budget", icon: PiggyBank },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 px-6 py-2 flex justify-between items-center pb-safe">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = location === link.href;
        return (
          <Link key={link.href} href={link.href} className="flex-1 flex flex-col items-center justify-center p-2">
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{link.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
