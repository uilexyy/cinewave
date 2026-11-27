"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/services/api";

interface LoginResponse { token?: string; user?: { id: string; name: string; email: string }; }

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiPost<LoginResponse>("auth/login", { email, password });
      if (data.token) localStorage.setItem("token", data.token);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-shell">
      <div className="hero-backdrop" aria-hidden="true" />
      <div className="auth-card">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          <span className="logo text-gradient">CineWave</span>
        </h1>
        <p className="muted" style={{ textAlign: "center", marginBottom: 28, fontSize: 14 }}>Sign in to continue</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
          No account? <Link href="/register" style={{ color: "var(--accent)" }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
