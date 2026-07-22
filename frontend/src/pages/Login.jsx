import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiLogIn, FiCheck } from "react-icons/fi";
import Loader from "../components/Loader";

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
    <div className="login-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div className="glass-card login-card" style={{
        display: "flex",
        width: "100%",
        maxWidth: "900px",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        border: "1px solid var(--border)",
        background: "var(--bg-surface)"
      }}>

        {/* Left Side: Description / Features info */}
        <div className="login-left-panel" style={{
          flex: 1.1,
          background: "linear-gradient(135deg, var(--accent) 0%, #312e81 100%)",
          color: "#fff",
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" }}>
              <div style={{
                width: "42px",
                height: "42px",
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}>
                📦
              </div>
              <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "0.5px" }}>WMS Portal</span>
            </div>

            <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "16px", lineHeight: 1.25 }}>
              Smart Warehouse Tracking & Metrics
            </h2>
            <p style={{ opacity: 0.85, fontSize: "14px", marginBottom: "32px", lineHeight: 1.6 }}>
              A centralized hub to monitor inventories, log kit updates, manage India Post dispatches, track manpower logs, and review QAA inspections.
            </p>

            {/* Feature lists */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
                    <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{f.title}</div>
                    <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "2px" }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "11px", opacity: 0.6, marginTop: "32px" }}>
            Warehouse Operations System v2.1 • Design Premium
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="login-right-panel" style={{ flex: 0.9, padding: "48px", background: "var(--bg-surface)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: "36px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)" }}>Welcome Back</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px" }}>
              Please enter your login credentials below
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "24px" }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <FiMail style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
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
              <FiLock style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
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
            <FiLogIn size={16} /> Sign In
          </button>
        </>
          )}
      </div>

    </div>
    </div >
  );
}

export default Login;