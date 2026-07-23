import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiLogIn, FiCheck } from "react-icons/fi";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("role", response.data.role);
      localStorage.setItem("warehouse_name", response.data.warehouse_name || "");
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="glass-card login-card">
        {/* Left Side: Branding & Info */}
        <div className="login-left-panel">
          <div>
            <div style={{
              background: "#ffffff",
              padding: "10px 16px",
              borderRadius: "14px",
              display: "inline-flex",
              alignItems: "center",
              marginBottom: "24px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}>
              <img
                src="/logo.png"
                alt="Pragyawan Technologies Limited"
                style={{ height: "42px", objectFit: "contain" }}
              />
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px", lineHeight: 1.25 }}>
              Smart Warehouse Tracking & Metrics
            </h2>
            <p style={{ opacity: 0.85, fontSize: "13px", marginBottom: "24px", lineHeight: 1.6 }}>
              A centralized hub to monitor inventories, log kit updates, manage India Post dispatches, track manpower logs, and review QAA inspections.
            </p>

            {/* Feature list — Hidden on mobile screens via CSS */}
            <div className="login-features-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { title: "Kitting Records", desc: "Log kit creation outputs across different trade sets." },
                { title: "QAA Inspections", desc: "Submit, inspect, pass/fail, and audit toolkit lots." },
                { title: "Dispatches & Returns", desc: "Mark packaging status and log India Post MS barcodes." },
                { title: "Manpower Tracking", desc: "Audit daily worker logs, supervisor hours, and registers." }
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "2px",
                    flexShrink: 0
                  }}>
                    <FiCheck size={12} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{f.title}</div>
                    <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "2px" }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "11px", opacity: 0.6, marginTop: "24px" }}>
            Warehouse Operations System v2.1 • Design Premium
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="login-right-panel">
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>Welcome Back</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px" }}>
              Please enter your login credentials below
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "20px" }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <FiMail style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                className="form-input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                style={{ paddingLeft: "36px", height: "40px" }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "28px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Password</label>
            <div style={{ position: "relative" }}>
              <FiLock style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
                style={{ paddingLeft: "36px", height: "40px" }}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={login}
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              height: "40px",
              fontSize: "14px",
              opacity: loading ? 0.75 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Verifying..." : <><FiLogIn size={16} /> Sign In</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;