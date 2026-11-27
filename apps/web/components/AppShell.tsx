"use client";

import { usePathname } from "next/navigation";
import TopNavbar from "./Navbar";
import MobileNav from "./MobileNav";

const STANDALONE = new Set(["/", "/login", "/register", "/player"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalone = STANDALONE.has(pathname) || pathname.startsWith("/player");

  if (standalone) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopNavbar />
      <div style={{ flex: 1 }}>{children}</div>
      <MobileNav />
    </div>
  );
}
