import Link from "next/link";

const ICONS: Record<string, React.ReactNode> = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>,
  search: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>,
  watchlist: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg>,
  history: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>,
  addons: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8M13 17h8"/></svg>,
  profile: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
};

const LINKS = [
  { href: "/home", label: "Home", key: "home" },
  { href: "/search", label: "Search", key: "search" },
  { href: "/watchlist", label: "Watchlist", key: "watchlist" },
  { href: "/history", label: "History", key: "history" },
  { href: "/addons", label: "Add-ons", key: "addons" },
  { href: "/profile", label: "Profile", key: "profile" },
];

export default function Sidebar({ active = "home" }: { active?: string }) {
  return (
    <>
      <aside className="sidebar" aria-label="Primary navigation">
        <Link href="/home" className="brand">
          <span className="brand-icon">C</span>
          <span>CineWave</span>
        </Link>
        {LINKS.map((l) => (
          <Link key={l.key} href={l.href} className={l.key === active ? "active" : ""} aria-current={l.key === active ? "page" : undefined}>
            {ICONS[l.key]}
            <span>{l.label}</span>
          </Link>
        ))}
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {LINKS.map((l) => (
          <Link key={l.key} href={l.href} className={l.key === active ? "active" : ""} aria-current={l.key === active ? "page" : undefined}>
            {ICONS[l.key]}
            <span>{l.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
