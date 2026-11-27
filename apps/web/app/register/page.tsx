"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/services/api";

interface RegisterResponse { token?: string; user?: { id: string; name: string; email: string }; }

export default function RegisterPage() {
  const [name, setName] = useState("");
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
      const data = await apiPost<RegisterResponse>("auth/register", { name, email, password });
      if (data.token) localStorage.setItem("token", data.token);
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          <span className="logo text-gradient">CineWave</span>
        </h1>
        <p className="muted" style={{ textAlign: "center", marginBottom: 28, fontSize: 14 }}>Create your account</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="muted" style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
          Already have an account? <Link href="/login" style={{ color: "var(--accent)" }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
