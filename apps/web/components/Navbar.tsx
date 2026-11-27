"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/search", label: "Search" },
  { href: "/watchlist", label: "My List" },
  { href: "/addons", label: "Add-ons" },
];

export default function TopNavbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <div className="container navbar-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <Link href="/home" className="brand" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", boxShadow: "0 4px 20px var(--accent-glow)" }}>C</span>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text)" }}>CineWave</span>
          </Link>
          <nav className="nav-links">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "nav-link active" : "nav-link"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/search" className="icon-btn" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          </Link>
          <Link href="/profile" className="avatar" aria-label="Profile" style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>
            U
          </Link>
        </div>
      </div>
    </header>
  );
}
