import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiSearch, FiEye } from "react-icons/fi";
import { isReadOnly } from "../utils/auth";

function Trade() {
  const [tradeName, setTradeName] = useState("");
  const [description, setDescription] = useState("");
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchTrades = useCallback(async () => {
    try {
      const response = await api.get("/trade");
      setTrades(response.data);
    } catch (error) { console.log(error); }
  }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const createTrade = async () => {
    if (!tradeName.trim()) { setMsg("Trade name is required."); return; }
    try {
      setAdding(true);
      setMsg("");
      await api.post("/trade", { trade_name: tradeName, description: description });
      setTradeName("");
      setDescription("");
      setShowForm(false);
      await fetchTrades();
    } catch {
      setMsg("Failed to create trade.");
    } finally {
      setAdding(false);
    }
  };

  const filtered = trades.filter((t) =>
    t.trade_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        {/* Read-only banner for superadmin */}
        {isReadOnly() && (
          <div className="alert" style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#f59e0b",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <FiEye size={14} style={{ flexShrink: 0 }} />
            <span>You are viewing as <strong>Super Admin</strong> — read-only mode. No changes can be made.</span>
          </div>
        )}

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Trade Management</h1>
            <p className="page-subtitle">Create and manage trade categories</p>
          </div>
          {!isReadOnly() && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setShowForm(!showForm); setMsg(""); }}
            >
              <FiPlus size={14} /> {showForm ? "Cancel" : "Add Trade"}
            </button>
          )}
        </div>

        {/* Add Form */}
        {showForm && !isReadOnly() && (
          <div className="card">
            <div className="card-title">New Trade</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Trade Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Electrician"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            {msg && <div className="alert alert-error">{msg}</div>}
            <button
              className="btn btn-primary btn-sm"
              onClick={createTrade}
              disabled={adding}
            >
              {adding ? "Saving..." : "Save Trade"}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              All Trades ({filtered.length})
            </span>
            <div className="search-bar">
              <FiSearch size={14} />
              <input
                placeholder="Search trade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Trade Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={3}><div className="empty-state">No trades found.</div></td></tr>
              ) : (
                filtered.map((trade, i) => (
                  <tr key={trade.id}>
                    <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      <span className="badge badge-purple">{trade.trade_name}</span>
                    </td>
                    <td>{trade.description || <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default Trade;