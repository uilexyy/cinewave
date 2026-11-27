import Link from "next/link";

const FEATURES = [
  { title: "Add-on System", description: "Power your catalog from community add-ons following the Stremio protocol." },
  { title: "Cinematic Dark UI", description: "Premium streaming experience with immersive visuals." },
  { title: "Secure Playback", description: "Legal source validation with SSRF protection and DNS rebinding prevention." },
  { title: "Your Library", description: "Personalized watchlist and watch history." },
];

export default function LandingPage() {
  return (
    <main className="fade-in">
      <nav className="navbar" style={{ position: "relative" }}>
        <div className="container navbar-inner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          <span className="logo text-gradient">CineWave</span>
          <div className="nav-links">
            <div className="nav-actions">
              <Link className="btn btn-ghost" href="/login">Login</Link>
              <Link className="btn btn-primary" href="/register">Register</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="container" style={{ padding: "0 24px" }}>
        <div className="hero" style={{ marginTop: 40, alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 560 }}>
          <div className="hero-fade" />
          <div className="hero-content" style={{ padding: "40px 24px", alignItems: "center", maxWidth: 760 }}>
            <span className="badge badge-accent" style={{ marginBottom: 20 }}>Powered by Add-ons</span>
            <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1 }}>Your Entertainment,<br /><span className="text-gradient">Your Way.</span></h1>
            <p className="hero-desc" style={{ fontSize: 17, maxWidth: 600, margin: "0 auto" }}>
              CineWave is a premium streaming platform powered by a modular add-on system. Install the add-ons you love, watch from their legal sources, and build your own cinematic library.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link className="btn btn-primary btn-lg" href="/home">Explore Catalog</Link>
              <Link className="btn btn-secondary btn-lg" href="/addons">Install Add-ons</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ marginTop: 96, padding: "0 24px" }}>
        <h2 className="section-title" style={{ fontSize: 28, textAlign: "center" }}>Why CineWave</h2>
        <div className="grid grid-4" style={{ marginTop: 32 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover">
              <h3 style={{ fontSize: 16, marginBottom: 8, fontWeight: 700 }}>{f.title}</h3>
              <p className="muted" style={{ fontSize: 14, lineHeight: 1.65 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>© 2026 CineWave. Your Entertainment, Your Way.</p>
          <p className="dim" style={{ marginTop: 6, fontSize: 12 }}>Add-on system with secure, legal streaming sources.</p>
        </div>
      </footer>
    </main>
  );
}
