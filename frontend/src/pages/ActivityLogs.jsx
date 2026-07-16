import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiSearch, FiX, FiActivity, FiEye } from "react-icons/fi";
import { isReadOnly } from "../utils/auth";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Column filters
  const [filterUser, setFilterUser] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/activity-logs");
      setLogs(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Helpers to get unique filter options
  const uniqueUsers = [...new Set(logs.map(l => l.username).filter(Boolean))].sort();
  const uniqueRoles = [...new Set(logs.map(l => l.role).filter(Boolean))].sort();
  const uniqueModules = [...new Set(logs.map(l => l.module).filter(Boolean))].sort();
  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();

  // Filter logic
  const filtered = logs.filter(log => {
    if (filterUser && log.username !== filterUser) return false;
    if (filterRole && log.role !== filterRole) return false;
    if (filterModule && log.module !== filterModule) return false;
    if (filterAction && log.action !== filterAction) return false;
    if (filterSearch.trim()) {
      const s = filterSearch.toLowerCase();
      if (
        !(log.details || "").toLowerCase().includes(s) &&
        !(log.username || "").toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilterUser("");
    setFilterRole("");
    setFilterModule("");
    setFilterAction("");
    setFilterSearch("");
    setCurrentPage(1);
  };

  const hasActiveFilters = filterUser || filterRole || filterModule || filterAction || filterSearch;

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getActionBadgeClass = (action) => {
    const act = action.toUpperCase();
    if (act.includes("DELETE")) return "badge-red";
    if (act.includes("ADD")) return "badge-green";
    if (act.includes("UPDATE")) return "badge-blue";
    if (act.includes("UPLOAD")) return "badge-purple";
    return "badge-gray";
  };

  const formatTimestamp = (tsStr) => {
    if (!tsStr) return "—";
    try {
      const date = new Date(tsStr);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch {
      return tsStr;
    }
  };

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
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <FiActivity style={{ color: "var(--accent)" }} /> Audit Logs & Trail
            </h1>
            <p className="page-subtitle">Track and audit additions, edits, deletions, and uploads across the system</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card" style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Filter System Logs ({filtered.length})</span>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                <FiX size={12} /> Clear Filters
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>User Email</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterUser} onChange={e => { setFilterUser(e.target.value); setCurrentPage(1); }}>
                <option value="">All Users</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Role</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}>
                <option value="">All Roles</option>
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Module</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterModule} onChange={e => { setFilterModule(e.target.value); setCurrentPage(1); }}>
                <option value="">All Modules</option>
                {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Action Type</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterAction} onChange={e => { setFilterAction(e.target.value); setCurrentPage(1); }}>
                <option value="">All Actions</option>
                {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Search Details</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} placeholder="Search action info..." value={filterSearch} onChange={e => { setFilterSearch(e.target.value); setCurrentPage(1); }} />
            </div>
          </div>
        </div>

        {/* Logs Table Card */}
        <div className="card">
          {loading ? (
            <div className="empty-state">⏳ Fetching activity trail logs...</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>#</th>
                      <th style={{ width: "160px" }}>Timestamp</th>
                      <th>User Email</th>
                      <th style={{ width: "100px" }}>Role</th>
                      <th style={{ width: "120px" }}>Module</th>
                      <th style={{ width: "120px" }}>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state">No audit logs found matching selected criteria.</div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((log, index) => (
                        <tr key={log.id}>
                          <td style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                            {((currentPage - 1) * pageSize) + index + 1}
                          </td>
                          <td style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "12px" }}>
                            {log.username}
                          </td>
                          <td>
                            <span className="badge badge-purple" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                              {log.role}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500, fontSize: "12px" }}>
                            {log.module}
                          </td>
                          <td>
                            <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontWeight: 700, fontSize: "10px" }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                            {log.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
                  </span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                      Prev
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: "600", padding: "6px 12px", color: "var(--text-primary)" }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default ActivityLogs;
