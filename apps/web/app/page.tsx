import Link from "next/link";

const FEATURES = [
  {
    title: "Add-on System",
    description: "Power your catalog from community add-ons following the Stremio protocol.",
  },
  {
    title: "Cinematic Dark UI",
    description: "Premium streaming experience with immersive visuals.",
  },
  {
    title: "Secure Playback",
    description: "Legal source validation with SSRF protection and DNS rebinding prevention.",
  },
  {
    title: "Your Library",
    description: "Personalized watchlist and watch history.",
  },
];

export default function LandingPage() {
  return (
    <main className="fade-in">
      {/* Navbar */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <span className="logo">CineWave</span>
          <div className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/login">Login</Link>
            <div className="nav-actions">
              <Link className="btn btn-ghost" href="/login">Login</Link>
              <Link className="btn btn-primary" href="/register">Register</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container">
        <div className="hero fade-in" style={{ marginTop: 40 }}>
          <span className="badge" style={{ marginBottom: 20, borderColor: "rgba(139,92,246,0.4)", color: "#C4B5FD" }}>
            Powered by Add-ons
          </span>
          <h1>Your Entertainment, Your Way.</h1>
          <p>
            CineWave is a premium streaming platform powered by a modular add-on system.
            Install the add-ons you love, watch from their legal sources, and build your own cinematic library.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Link className="btn btn-primary" href="/home">Explore Catalog</Link>
            <Link className="btn btn-secondary" href="/addons">Install Add-ons</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container" style={{ marginTop: 80 }}>
        <h2 className="section-title" style={{ fontSize: 28 }}>Why CineWave</h2>
        <div className="grid grid-4" style={{ marginTop: 24 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>© 2026 CineWave. Your Entertainment, Your Way.</p>
          <p style={{ marginTop: 6, fontSize: 12 }}>
            Add-on system with secure, legal streaming sources.
          </p>
        </div>
      </footer>
    </main>
  );
}
