import Link from "next/link";

export default function Sidebar({ active = "home" }: { active?: string }) {
  const links = [
    { href: "/home", label: "Home", key: "home" },
    { href: "/search", label: "Search", key: "search" },
    { href: "/watchlist", label: "Watchlist", key: "watchlist" },
    { href: "/history", label: "History", key: "history" },
    { href: "/addons", label: "Add-ons", key: "addons" },
    { href: "/profile", label: "Profile", key: "profile" },
  ];

  return (
    <aside className="sidebar">
      <span className="logo" style={{ fontSize: 24 }}>CineWave</span>
      {links.map((l) => (
        <Link key={l.key} href={l.href} className={l.key === active ? "active" : ""}>
          {l.label}
        </Link>
      ))}
    </aside>
  );
}
