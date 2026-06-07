import { cookies } from "next/headers";
import { BottomNav } from "@/components/bottom-nav";
import { LogoutButton } from "@/components/logout-button";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hasSession = Boolean(cookies().get(SESSION_COOKIE_NAME)?.value);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
        {hasSession ? (
          <header className="sticky top-0 z-20 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted">个人日程与目标</p>
                <h1 className="text-lg font-semibold tracking-normal text-ink">日程安排</h1>
              </div>
              <LogoutButton />
            </div>
          </header>
        ) : null}
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6">{children}</main>
        {hasSession ? <BottomNav /> : null}
      </div>
    </div>
  );
}
