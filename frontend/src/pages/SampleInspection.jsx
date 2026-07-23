import { useState, useEffect } from "react";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiEye, FiDownload, FiUpload } from "react-icons/fi";
import { isReadOnly, isWarehouseManager } from "../utils/auth";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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
  const [loading, setLoading] = useState(true);

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
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchRecords(), fetchWarehouses()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(activeTab === "factory" ? "Factory Sample Inspection Report" : "Sample Approved Inspection Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Date", "Firm", "Warehouse", "Trade", "Sample Name", "Qty", "Status", "Remarks"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.date || "—",
        item.firm || "—",
        item.warehouse_name || "—",
        item.trade || "—",
        item.sample_name || "—",
        String(item.quantity ?? 1),
        item.status || "Pending",
        item.remarks || "—"
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save(activeTab === "factory" ? "factory_sample_report.pdf" : "sample_approved_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Inspection Date": item.date,
      "Firm": item.firm,
      "Warehouse": item.warehouse_name,
      "Trade": item.trade,
      "Sample Name": item.sample_name,
      "Quantity": item.quantity,
      "Status": item.status,
      "Remarks": item.remarks
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample Inspection");
    XLSX.writeFile(wb, activeTab === "factory" ? "factory_sample_report.xlsx" : "sample_approved_report.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isWarehouseManager()) {
      const proceed = window.confirm(
        "⚠️ Attention: Please ensure that all entries in your Excel file are valid and correct before uploading. As a Warehouse Manager, you will not have permission to delete entries once they are imported. Do you want to proceed with the upload?"
      );
      if (!proceed) {
        e.target.value = "";
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert("The uploaded Excel file appears to be empty.");
          return;
        }

        let successCount = 0;
        for (const row of data) {
          const date = row["Inspection Date"] || row["Date"] || row["date"] || "";
          const firm = row["Firm"] || row["firm"] || "";
          const warehouse_name = row["Warehouse"] || row["Warehouse Name"] || row["warehouse_name"] || "";
          const trade = row["Trade"] || row["trade"] || "";
          const sample_name = row["Sample Name"] || row["Sample"] || row["sample_name"] || "";
          const quantity = row["Quantity"] || row["Qty"] || row["qty"] || 1;
          const status = row["Status"] || row["status"] || "Pending";
          const remarks = row["Remarks"] || row["remarks"] || "";

          if (date && firm && warehouse_name && trade && sample_name) {
            await api.post("/sample-inspections", {
              date: toDMY(String(date)),
              firm: String(firm),
              warehouse_name: String(warehouse_name),
              trade: String(trade),
              sample_name: String(sample_name),
              quantity: Number(quantity) || 1,
              status: String(status),
              remarks: String(remarks),
              sample_type: activeTab === "approved" ? "approved" : "factory"
            });
            successCount++;
          }
        }
        alert(`Successfully imported ${successCount} sample inspection record(s).`);
        fetchRecords();
      } catch (err) {
        console.error(err);
        alert("Failed to process Excel file.");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
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

        <div className="page-header">
          <div>
            <h1 className="page-title">Sample Inspection Log</h1>
            <p className="page-subtitle">Track quality inspections of toolkit samples before final dispatch approval</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
              <FiDownload size={13} /> PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
              <FiDownload size={13} /> Excel
            </button>
            {!isReadOnly() && (
              <>
                <input
                  type="file"
                  id="sample-excel-input"
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => document.getElementById("sample-excel-input").click()}
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <FiUpload size={14} /> Upload Excel
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
                  <FiPlus size={14} /> {showForm ? "Cancel" : "Add Sample Log"}
                </button>
              </>
            )}
          </div>
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
        {loading ? (
          <Loader message="Loading sample inspections..." />
        ) : (
          <>
            {/* New entry form */}
            {showForm && !isReadOnly() && (
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
            {editId && !isReadOnly() && (
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
                      {!isReadOnly() && <th>ACTIONS</th>}
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
                          {!isReadOnly() && (
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
                          )}
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
          </>
        )}

      </div>
    </div>
  );
}

export default SampleInspection;
