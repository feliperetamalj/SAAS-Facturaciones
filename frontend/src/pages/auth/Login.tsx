import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const rol = useAuth.getState().user?.rol;
      if (rol === "admin") navigate("/admin");
      else if (rol === "board") navigate("/board");
      else navigate("/tenant");
    } catch {
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-card bg-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">A</div>
          <h1 className="text-xl font-bold text-ink">Alto Las Rastras</h1>
          <p className="text-sm text-ink-2">Sistema de Facturación</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-card p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-ink">Iniciar sesión</h2>

          {error && (
            <div className="bg-warn-soft text-warn border border-warn/30 rounded-component px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2 uppercase tracking-wide">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@alr.cl"
              required
              className="w-full border border-border rounded-component px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-border rounded-component px-3 py-2 text-sm text-ink bg-paper focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium py-2 px-4 rounded-component text-sm transition-colors"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-2 mt-4">
          Admin: admin@alr.cl / admin123
        </p>
      </div>
    </div>
  );
}
