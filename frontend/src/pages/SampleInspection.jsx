import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch } from "react-icons/fi";

const FIRM_OPTIONS = ["ITI", "PTL", "VTL"];

const FIRM_TRADE_MAP = {
  "ITI": [
    "Barber (Naai)",
    "Potter (Kumhar)",
    "Washerman (Dhobi)"
  ],
  "PTL": [
    "Armourer",
    "Metal Smith / Metal Caster",
    "Sculptor (Moortikar)/Stone Carver/Stone Breaker",
    "Hammer and ToolKit Maker",
    "Fishing Net Maker",
    "Boat Maker",
    "Barber (Naai)"
  ],
  "VTL": [
    "Potter (Kumhar)",
    "Washerman (Dhobi)"
  ]
};

const toDMY = (dateStr) => {
  if (!dateStr) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const toYMD = (dateStr) => {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m}-${d}`;
  }
  return dateStr;
};

function SampleInspection() {
  const [activeTab, setActiveTab] = useState("factory"); // factory, approved
  const [records, setRecords] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const emptyForm = {
    date: "",
    firm: "",
    warehouse_name: "",
    trade: "",
    sample_name: "",
    quantity: 1,
    status: "Pending",
    remarks: ""
  };

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchRecords();
    fetchWarehouses();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await api.get("/sample-inspections");
      setRecords(res.data);
    } catch (e) {
      console.error("Failed to fetch sample inspection records:", e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data);
    } catch (e) {
      console.error("Failed to fetch warehouses:", e);
    }
  };

  const handleCreate = async () => {
    if (!form.date || !form.firm || !form.warehouse_name || !form.trade || !form.sample_name) {
      setMsg("Please fill in all required fields (Date, Firm, Warehouse, Trade, and Sample Name).");
      return;
    }
    try {
      const payload = {
        date: toDMY(form.date),
        firm: form.firm,
        warehouse_name: form.warehouse_name,
        trade: form.trade,
        sample_name: form.sample_name,
        quantity: form.quantity ? Number(form.quantity) : 1,
        status: form.status || "Pending",
        remarks: form.remarks || "",
        sample_type: form.status === "Approved" ? "approved" : "factory"
      };

      await api.post("/sample-inspections", payload);
      setForm(emptyForm);
      setShowForm(false);
      setMsg("");
      fetchRecords();
    } catch (e) {
      setMsg("Failed to create sample inspection entry.");
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({
      date: toYMD(item.date) || "",
      firm: item.firm || "",
      warehouse_name: item.warehouse_name || "",
      trade: item.trade || "",
      sample_name: item.sample_name || "",
      quantity: item.quantity ?? 1,
      status: item.status || "Pending",
      remarks: item.remarks || ""
    });
    setShowForm(false);
    setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("sample-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleUpdate = async () => {
    if (!editForm.date || !editForm.firm || !editForm.warehouse_name || !editForm.trade || !editForm.sample_name) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      const payload = {
        date: toDMY(editForm.date),
        firm: editForm.firm,
        warehouse_name: editForm.warehouse_name,
        trade: editForm.trade,
        sample_name: editForm.sample_name,
        quantity: editForm.quantity ? Number(editForm.quantity) : 1,
        status: editForm.status,
        remarks: editForm.remarks || "",
        sample_type: editForm.status === "Approved" ? "approved" : "factory"
      };

      await api.put(`/sample-inspections/${editId}`, payload);
      const updatedId = editId;
      setEditId(null);
      fetchRecords();

      // Highlight row
      setTimeout(() => {
        const row = document.getElementById(`sample-row-${updatedId}`);
        if (row) {
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch (e) {
      alert("Failed to update sample inspection entry.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/sample-inspections/${id}`);
      setDeleteConfirmId(null);
      fetchRecords();
    } catch (e) {
      alert("Failed to delete entry.");
    }
  };

  // Filter based on active tab and search
  const filtered = records.filter(item => {
    // 1. Filter by sample type
    if (activeTab === "factory" && item.sample_type !== "factory") return false;
    if (activeTab === "approved" && item.sample_type !== "approved") return false;

    // 2. Filter by search
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (item.sample_name || "").toLowerCase().includes(s) ||
      (item.warehouse_name || "").toLowerCase().includes(s) ||
      (item.trade || "").toLowerCase().includes(s) ||
      (item.firm || "").toLowerCase().includes(s) ||
      (item.remarks || "").toLowerCase().includes(s)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabStyle = (tab) => ({
    padding: "8px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    transition: "all 0.15s",
    background: activeTab === tab ? "var(--accent)" : "transparent",
    color: activeTab === tab ? "#fff" : "var(--text-secondary)",
  });

  const availableTradesForForm = form.firm ? (FIRM_TRADE_MAP[form.firm] || []) : [];
  const availableTradesForEdit = editForm.firm ? (FIRM_TRADE_MAP[editForm.firm] || []) : [];

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        <div className="page-header">
          <div>
            <h1 className="page-title">Sample Inspection Log</h1>
            <p className="page-subtitle">Track quality inspections of toolkit samples before final dispatch approval</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
            <FiPlus size={14} /> {showForm ? "Cancel" : "Add Sample Log"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "var(--bg-surface)", padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", width: "fit-content" }}>
          <button style={tabStyle("factory")} onClick={() => { setActiveTab("factory"); setCurrentPage(1); }}>
            🏭 Factory Sample
          </button>
          <button style={tabStyle("approved")} onClick={() => { setActiveTab("approved"); setCurrentPage(1); }}>
            ✅ Sample Approved
          </button>
        </div>

        {/* New entry form */}
        {showForm && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-title">New Sample Inspection Entry</div>
            <div className="form-grid" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Inspection Date *</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Firm *</label>
                <select className="form-select" value={form.firm} onChange={(e) => setForm(f => ({ ...f, firm: e.target.value, trade: "" }))}>
                  <option value="">--Select Firm--</option>
                  {FIRM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Name *</label>
                <select className="form-select" value={form.warehouse_name} onChange={(e) => setForm(f => ({ ...f, warehouse_name: e.target.value }))}>
                  <option value="">--Select Warehouse--</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trade *</label>
                <select className="form-select" value={form.trade} onChange={(e) => setForm(f => ({ ...f, trade: e.target.value }))} disabled={!form.firm}>
                  <option value="">--Select Trade--</option>
                  {availableTradesForForm.map(trd => <option key={trd} value={trd}>{trd}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sample Name *</label>
                <input className="form-input" placeholder="e.g. Stone Polisher Wheel" value={form.sample_name} onChange={(e) => setForm(f => ({ ...f, sample_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Inspection Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Remarks</label>
                <input className="form-input" placeholder="Feedback or findings details" value={form.remarks} onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>
            {msg && <div className="alert alert-error">{msg}</div>}
            <button className="btn btn-primary btn-sm" onClick={handleCreate}><FiCheck size={13} /> Save Entry</button>
          </div>
        )}

        {/* Edit form card */}
        {editId && (
          <div id="sample-edit-form-container" className="card" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                ✏️ Edit Sample Entry — ID #{editId}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const prevId = editId;
                setEditId(null);
                setTimeout(() => {
                  const row = document.getElementById(`sample-row-${prevId}`);
                  if (row) {
                    row.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }, 100);
              }}><FiX size={14} /> Cancel</button>
            </div>
            <div className="form-grid" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Inspection Date *</label>
                <input className="form-input" type="date" value={editForm.date} onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Firm *</label>
                <select className="form-select" value={editForm.firm} onChange={(e) => setEditForm(f => ({ ...f, firm: e.target.value, trade: "" }))}>
                  <option value="">--Select Firm--</option>
                  {FIRM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Name *</label>
                <select className="form-select" value={editForm.warehouse_name} onChange={(e) => setEditForm(f => ({ ...f, warehouse_name: e.target.value }))}>
                  <option value="">--Select Warehouse--</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trade *</label>
                <select className="form-select" value={editForm.trade} onChange={(e) => setEditForm(f => ({ ...f, trade: e.target.value }))} disabled={!editForm.firm}>
                  <option value="">--Select Trade--</option>
                  {availableTradesForEdit.map(trd => <option key={trd} value={trd}>{trd}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sample Name *</label>
                <input className="form-input" value={editForm.sample_name} onChange={(e) => setEditForm(f => ({ ...f, sample_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" value={editForm.quantity} onChange={(e) => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Inspection Status</label>
                <select className="form-select" value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Remarks</label>
                <input className="form-input" value={editForm.remarks} onChange={(e) => setEditForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleUpdate}><FiCheck size={13} /> Save Changes</button>
          </div>
        )}

        {/* Records table */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              {activeTab === "factory" ? "Factory Sample Logs" : "Sample Approved Logs"} ({filtered.length})
            </span>
            <div className="search-bar">
              <FiSearch size={14} />
              <input placeholder="Search sample, warehouse, trade..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>INSPECTION DATE</th>
                  <th>FIRM</th>
                  <th>WAREHOUSE</th>
                  <th>TRADE</th>
                  <th>SAMPLE NAME</th>
                  <th>QTY</th>
                  <th>STATUS</th>
                  <th>REMARKS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="empty-state">No sample inspection records found.</div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item, index) => (
                    <tr id={`sample-row-${item.id}`} key={item.id}>
                      <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + index + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.date}</td>
                      <td>{item.firm}</td>
                      <td>{item.warehouse_name}</td>
                      <td><span className="badge badge-purple">{item.trade}</span></td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.sample_name}</td>
                      <td><span className="badge badge-blue">{item.quantity}</span></td>
                      <td>
                        <span className={`badge ${item.status === "Approved" ? "badge-green" : item.status === "Rejected" ? "badge-red" : "badge-orange"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.remarks || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}><FiEdit2 size={13} /></button>
                          {deleteConfirmId === item.id ? (
                            <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                              Sure?
                              <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(item.id)}><FiCheck size={13} /></button>
                              <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                            </span>
                          ) : (
                            <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }} onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}><FiTrash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
        </div>

      </div>
    </div>
  );
}

export default SampleInspection;
