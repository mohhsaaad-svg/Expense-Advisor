import { Sidebar, MobileNav } from "@/components/Sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-28 md:pb-0 relative">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-secondary/80 to-transparent pointer-events-none -z-10" />
        <div className="max-w-5xl mx-auto w-full p-6 md:p-10 lg:p-12 relative z-0">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}