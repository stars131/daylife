"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CalendarDays, Home, Target } from "lucide-react";
import { clsx } from "clsx";

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/goals", label: "目标", icon: Target }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-5xl grid-cols-4">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                active ? "text-accent" : "text-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
