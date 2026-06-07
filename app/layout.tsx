import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "个人日程、任务和长期目标管理"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f8faf9"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
