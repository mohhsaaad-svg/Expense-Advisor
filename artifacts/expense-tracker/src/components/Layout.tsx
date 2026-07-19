import { Sidebar, MobileNav } from "@/components/Sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="max-w-5xl mx-auto w-full p-6 md:p-10">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}