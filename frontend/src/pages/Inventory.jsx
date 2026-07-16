import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiDownload, FiEye } from "react-icons/fi";
import { isReadOnly } from "../utils/auth";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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

const TRADE_OPTIONS = [
  "Armourer",
  "Metal Smith / Metal Caster",
  "Sculptor (Moortikar)/Stone Carver/Stone Breaker",
  "Hammer and ToolKit Maker",
  "Fishing Net Maker",
  "Boat Maker",
  "Barber (Naai)",
  "Potter (Kumhar)",
  "Washerman (Dhobi)"
];

/* ─────────────────────────────────────────────
   Inward Sub-Component
───────────────────────────────────────────── */
function InwardSection() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  // Column filters
  const [filterDate, setFilterDate] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterTrade, setFilterTrade] = useState("");

  // Pagination & Selection states
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const pageSize = 50;

  const emptyForm = {
    received_date: "", received_qty: "", invoice_date: "",
    invoice_no: "", invoice_qty: "", short_damage_qty: "",
    item_name: "", brand_description: "", trade_name: ""
  };
  const [form, setForm] = useState(emptyForm);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { const r = await api.get("/inventory-inward"); setEntries(r.data); }
    catch (e) { console.log(e); }
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const handleEditChange = (key, val) => setEditForm((f) => ({ ...f, [key]: val }));

  const createEntry = async () => {
    if (!form.received_date) { setMsg("Received Date is required."); return; }
    try {
      await api.post("/inventory-inward", {
        received_date: toDMY(form.received_date),
        received_qty: form.received_qty ? Number(form.received_qty) : null,
        invoice_date: toDMY(form.invoice_date) || null,
        invoice_no: form.invoice_no || null,
        invoice_qty: form.invoice_qty ? Number(form.invoice_qty) : null,
        short_damage_qty: form.short_damage_qty ? Number(form.short_damage_qty) : null,
        item_name: form.item_name || null,
        brand_description: form.brand_description || null,
        trade_name: form.trade_name || null
      });
      setForm(emptyForm); setShowForm(false); setMsg(""); fetchEntries();
    } catch { setMsg("Failed to save inward entry."); }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({
      received_date: toYMD(item.received_date) || "", received_qty: item.received_qty ?? "",
      invoice_date: toYMD(item.invoice_date) || "", invoice_no: item.invoice_no || "",
      invoice_qty: item.invoice_qty ?? "", short_damage_qty: item.short_damage_qty ?? "",
      item_name: item.item_name || "", brand_description: item.brand_description || "",
      trade_name: item.trade_name || ""
    });
    setShowForm(false); setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("inward-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const updateEntry = async () => {
    if (!editForm.received_date) { alert("Received Date is required."); return; }
    try {
      await api.put(`/inventory-inward/${editId}`, {
        received_date: toDMY(editForm.received_date),
        received_qty: editForm.received_qty ? Number(editForm.received_qty) : null,
        invoice_date: toDMY(editForm.invoice_date) || null,
        invoice_no: editForm.invoice_no || null,
        invoice_qty: editForm.invoice_qty ? Number(editForm.invoice_qty) : null,
        short_damage_qty: editForm.short_damage_qty ? Number(editForm.short_damage_qty) : null,
        item_name: editForm.item_name || null,
        brand_description: editForm.brand_description || null,
        trade_name: editForm.trade_name || null
      });
      const updatedId = editId;
      setEditId(null); 
      fetchEntries();
      setTimeout(() => {
        const row = document.getElementById(`inward-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch { alert("Failed to update inward entry."); }
  };

  const deleteEntry = async (id) => {
    try {
      await api.delete(`/inventory-inward/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchEntries();
    }
    catch { alert("Failed to delete inward entry."); }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/inventory-inward/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchEntries();
    } catch {
      alert("Failed to delete selected inward entries.");
    }
  };

  const uniqueTrades = [...new Set(entries.map(e => e.trade_name).filter(Boolean))].sort();

  const filtered = entries.filter((item) => {
    if (filterDate && !(item.received_date || "").includes(filterDate)) return false;
    if (filterItemName && !(item.item_name || "").toLowerCase().includes(filterItemName.toLowerCase())) return false;
    if (filterInvoiceNo && !(item.invoice_no || "").toLowerCase().includes(filterInvoiceNo.toLowerCase())) return false;
    if (filterTrade && (item.trade_name || "") !== filterTrade) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(""); setFilterItemName(""); setFilterInvoiceNo(""); setFilterTrade(""); setCurrentPage(1);
  };

  const hasActiveFilters = filterDate || filterItemName || filterInvoiceNo || filterTrade;

  // Master Checkbox Logic
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Inward Stock Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Received Date", "Received Qty", "Invoice Date", "Invoice No.", "Invoice Qty", "Short/Damage", "Item Name", "Brand/Desc"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.received_date || "—",
        String(item.received_qty ?? "—"),
        item.invoice_date || "—",
        item.invoice_no || "—",
        String(item.invoice_qty ?? "—"),
        String(item.short_damage_qty ?? "—"),
        item.item_name || "—",
        item.brand_description || "—"
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save("inward_stock_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Received Date": item.received_date,
      "Received Qty": item.received_qty,
      "Invoice Date": item.invoice_date,
      "Invoice No.": item.invoice_no,
      "Invoice Qty": item.invoice_qty,
      "Short/Damage Qty": item.short_damage_qty,
      "Item Name": item.item_name,
      "Brand/Description": item.brand_description
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inward Stock");
    XLSX.writeFile(wb, "inward_stock_report.xlsx");
  };

  const formFields = [
    { key: "received_date", label: "Received Date", type: "date" },
    { key: "received_qty", label: "Received Qty", type: "number" },
    { key: "invoice_date", label: "Invoice Date", type: "date" },
    { key: "invoice_no", label: "Invoice No.", type: "text", placeholder: "e.g. INV-2024-001" },
    { key: "invoice_qty", label: "Invoice Qty", type: "number" },
    { key: "short_damage_qty", label: "Short/Damage Qty", type: "number" },
    { key: "item_name", label: "Item Name", type: "text", placeholder: "e.g. Safety Helmet" },
    { key: "brand_description", label: "Brand / Description", type: "text", placeholder: "e.g. 3M — Industrial Grade" },
    { key: "trade_name", label: "Trade Category", type: "select" }
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
          <FiDownload size={13} /> PDF
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
          <FiDownload size={13} /> Excel
        </button>
        {!isReadOnly() && (
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
            <FiPlus size={14} /> {showForm ? "Cancel" : "Add Inward Entry"}
          </button>
        )}
      </div>

      {showForm && !isReadOnly() && (
        <div className="card">
          <div className="card-title">New Inward Stock Entry</div>
          <div className="form-grid">
            {formFields.map(({ key, label, type, placeholder }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                {type === "select" ? (
                  <select
                    className="form-select"
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">— Select Trade —</option>
                    {TRADE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-input" type={type} placeholder={placeholder || ""}
                    value={form[key]} onChange={(e) => handleChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          {msg && <div className="alert alert-error">{msg}</div>}
          <button className="btn btn-primary btn-sm" onClick={createEntry}><FiCheck size={13} /> Save Entry</button>
        </div>
      )}

      {editId && !isReadOnly() && (
        <div id="inward-edit-form-container" className="card">
          <div className="card-title">Edit Inward Entry — ID #{editId}</div>
          <div className="form-grid">
            {formFields.map(({ key, label, type, placeholder }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                {type === "select" ? (
                  <select
                    className="form-select"
                    value={editForm[key]}
                    onChange={(e) => handleEditChange(key, e.target.value)}
                  >
                    <option value="">— Select Trade —</option>
                    {TRADE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-input" type={type} placeholder={placeholder || ""}
                    value={editForm[key]} onChange={(e) => handleEditChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="btn btn-primary btn-sm" onClick={updateEntry}><FiCheck size={13} /> Save Changes</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const prevId = editId;
              setEditId(null);
              setTimeout(() => {
                const row = document.getElementById(`inward-row-${prevId}`);
                if (row) {
                  row.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            }}><FiX size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Inward Records ({filtered.length})</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!isReadOnly() && selectedIds.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                <FiTrash2 size={13} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                <FiX size={12} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px", marginBottom: "14px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Received Date</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Item Name</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterItemName} onChange={e => { setFilterItemName(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice No</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterInvoiceNo} onChange={e => { setFilterInvoiceNo(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade Category</div>
            <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterTrade} onChange={e => { setFilterTrade(e.target.value); setCurrentPage(1); }}>
              <option value="">All</option>
              {uniqueTrades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {!isReadOnly() && (
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                )}
                <th>#</th><th>Received Date</th><th>Received Qty</th><th>Invoice Date</th>
                <th>Invoice No.</th><th>Invoice Qty</th><th>Short/Damage</th><th>Item Name</th><th>Brand/Desc</th><th>Trade</th>
                {!isReadOnly() && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={12}><div className="empty-state">No inward entries found.</div></td></tr>
              ) : (
                paginated.map((item, i) => (
                  <tr id={`inward-row-${item.id}`} key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
                    {!isReadOnly() && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                    )}
                    <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + i + 1}</td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.received_date}</td>
                    <td><span className="badge badge-blue" style={{ fontWeight: 700 }}>{item.received_qty ?? "—"}</span></td>
                    <td>{item.invoice_date || "—"}</td>
                    <td><code>{item.invoice_no || "—"}</code></td>
                    <td>{item.invoice_qty ?? "—"}</td>
                    <td>
                      {item.short_damage_qty ? (
                        <span className="badge badge-red">{item.short_damage_qty}</span>
                      ) : "—"}
                    </td>
                    <td>{item.item_name || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                    <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.brand_description || "—"}
                    </td>
                    <td>
                      {item.trade_name ? (
                        <span className="badge badge-purple">{item.trade_name}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                      )}
                    </td>
                    {!isReadOnly() && (
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}><FiEdit2 size={13} /></button>
                          {deleteConfirmId === item.id ? (
                            <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                              Sure?
                              <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteEntry(item.id)}><FiCheck size={13} /></button>
                              <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                            </span>
                          ) : (
                            <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }}
                              onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}>
                              <FiTrash2 size={13} />
                            </button>
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
  );
}

/* ─────────────────────────────────────────────
   Outward Sub-Component
───────────────────────────────────────────── */
function OutwardSection() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");

  // Column filters
  const [filterDate, setFilterDate] = useState("");
  const [filterInvoiceNo, setFilterInvoiceNo] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  const [filterTrade, setFilterTrade] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Pagination & Selection states
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const pageSize = 50;

  const emptyForm = {
    transfer_date: "", invoice_no: "", item_name: "",
    brand: "", trade_name: "", qty: "",
    warehouse_from: "", warehouse_to: ""
  };
  const [form, setForm] = useState(emptyForm);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try { const r = await api.get("/inventory-outward"); setEntries(r.data); }
    catch (e) { console.log(e); }
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const handleEditChange = (key, val) => setEditForm((f) => ({ ...f, [key]: val }));

  const createEntry = async () => {
    if (!form.transfer_date) { setMsg("Transfer Date is required."); return; }
    try {
      await api.post("/inventory-outward", {
        transfer_date: toDMY(form.transfer_date),
        invoice_no: form.invoice_no || null,
        item_name: form.item_name || null,
        brand: form.brand || null,
        trade_name: form.trade_name || null,
        qty: form.qty ? Number(form.qty) : null,
        warehouse_from: form.warehouse_from || null,
        warehouse_to: form.warehouse_to || null
      });
      setForm(emptyForm); setShowForm(false); setMsg(""); fetchEntries();
    } catch { setMsg("Failed to save outward entry."); }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({
      transfer_date: toYMD(item.transfer_date) || "", invoice_no: item.invoice_no || "",
      item_name: item.item_name || "", brand: item.brand || "",
      trade_name: item.trade_name || "", qty: item.qty ?? "",
      warehouse_from: item.warehouse_from || "", warehouse_to: item.warehouse_to || ""
    });
    setShowForm(false); setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("outward-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const updateEntry = async () => {
    if (!editForm.transfer_date) { alert("Transfer Date is required."); return; }
    try {
      await api.put(`/inventory-outward/${editId}`, {
        transfer_date: toDMY(editForm.transfer_date),
        invoice_no: editForm.invoice_no || null,
        item_name: editForm.item_name || null,
        brand: editForm.brand || null,
        trade_name: editForm.trade_name || null,
        qty: editForm.qty ? Number(editForm.qty) : null,
        warehouse_from: editForm.warehouse_from || null,
        warehouse_to: editForm.warehouse_to || null
      });
      const updatedId = editId;
      setEditId(null); 
      fetchEntries();
      setTimeout(() => {
        const row = document.getElementById(`outward-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch { alert("Failed to update outward entry."); }
  };

  const deleteEntry = async (id) => {
    try {
      await api.delete(`/inventory-outward/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchEntries();
    }
    catch { alert("Failed to delete outward entry."); }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/inventory-outward/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchEntries();
    } catch {
      alert("Failed to delete selected outward entries.");
    }
  };

  const uniqueTrades = [...new Set(entries.map(e => e.trade_name).filter(Boolean))].sort();
  const uniqueFroms = [...new Set(entries.map(e => e.warehouse_from).filter(Boolean))].sort();
  const uniqueTos = [...new Set(entries.map(e => e.warehouse_to).filter(Boolean))].sort();

  const filtered = entries.filter((item) => {
    if (filterDate && !(item.transfer_date || "").includes(filterDate)) return false;
    if (filterInvoiceNo && !(item.invoice_no || "").toLowerCase().includes(filterInvoiceNo.toLowerCase())) return false;
    if (filterItemName && !(item.item_name || "").toLowerCase().includes(filterItemName.toLowerCase())) return false;
    if (filterTrade && (item.trade_name || "") !== filterTrade) return false;
    if (filterFrom && (item.warehouse_from || "") !== filterFrom) return false;
    if (filterTo && (item.warehouse_to || "") !== filterTo) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(""); setFilterInvoiceNo(""); setFilterItemName(""); setFilterTrade(""); setFilterFrom(""); setFilterTo(""); setCurrentPage(1);
  };

  const hasActiveFilters = filterDate || filterInvoiceNo || filterItemName || filterTrade || filterFrom || filterTo;

  // Master Checkbox Logic
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(i => i.id));
    }
  };

  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Outward Stock Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Transfer Date", "Invoice No.", "Item Name", "Brand", "Trade Name", "Qty", "Location From", "Location To"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.transfer_date || "—",
        item.invoice_no || "—",
        item.item_name || "—",
        item.brand || "—",
        item.trade_name || "—",
        String(item.qty ?? "—"),
        item.warehouse_from || "—",
        item.warehouse_to || "—"
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save("outward_stock_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Transfer Date": item.transfer_date,
      "Invoice No.": item.invoice_no,
      "Item Name": item.item_name,
      "Brand": item.brand,
      "Trade Name": item.trade_name,
      "Qty": item.qty,
      "Warehouse Location From": item.warehouse_from,
      "Warehouse Location To": item.warehouse_to
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Outward Stock");
    XLSX.writeFile(wb, "outward_stock_report.xlsx");
  };

  const formFields = [
    { key: "transfer_date", label: "Transfer Date", type: "date" },
    { key: "invoice_no", label: "Invoice No.", type: "text", placeholder: "e.g. INV-2024-001" },
    { key: "item_name", label: "Item Name", type: "text", placeholder: "e.g. Copper Wire" },
    { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Finolex" },
    { key: "trade_name", label: "Trade Name", type: "text", placeholder: "e.g. Electrical" },
    { key: "qty", label: "Qty", type: "number" },
    { key: "warehouse_from", label: "Warehouse Location From", type: "text", placeholder: "e.g. Main Hub" },
    { key: "warehouse_to", label: "Warehouse Location To", type: "text", placeholder: "e.g. Site A" },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
          <FiDownload size={13} /> PDF
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
          <FiDownload size={13} /> Excel
        </button>
        {!isReadOnly() && (
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
            <FiPlus size={14} /> {showForm ? "Cancel" : "Add Outward Entry"}
          </button>
        )}
      </div>

      {showForm && !isReadOnly() && (
        <div className="card">
          <div className="card-title">New Outward Stock Entry</div>
          <div className="form-grid">
            {formFields.map(({ key, label, type, placeholder }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input" type={type} placeholder={placeholder || ""}
                  value={form[key]} onChange={(e) => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          {msg && <div className="alert alert-error">{msg}</div>}
          <button className="btn btn-primary btn-sm" onClick={createEntry}><FiCheck size={13} /> Save Entry</button>
        </div>
      )}

      {editId && !isReadOnly() && (
        <div id="outward-edit-form-container" className="card">
          <div className="card-title">Edit Outward Entry — ID #{editId}</div>
          <div className="form-grid">
            {formFields.map(({ key, label, type, placeholder }) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input" type={type} placeholder={placeholder || ""}
                  value={editForm[key]} onChange={(e) => handleEditChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button className="btn btn-primary btn-sm" onClick={updateEntry}><FiCheck size={13} /> Save Changes</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const prevId = editId;
              setEditId(null);
              setTimeout(() => {
                const row = document.getElementById(`outward-row-${prevId}`);
                if (row) {
                  row.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            }}><FiX size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Outward Records ({filtered.length})</span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!isReadOnly() && selectedIds.length > 0 && (
              <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                <FiTrash2 size={13} /> Delete Selected ({selectedIds.length})
              </button>
            )}
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                <FiX size={12} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px", marginBottom: "14px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Transfer Date</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Invoice No</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterInvoiceNo} onChange={e => { setFilterInvoiceNo(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Item Name</div>
            <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterItemName} onChange={e => { setFilterItemName(e.target.value); setCurrentPage(1); }} />
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade Name</div>
            <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterTrade} onChange={e => { setFilterTrade(e.target.value); setCurrentPage(1); }}>
              <option value="">All</option>
              {uniqueTrades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location From</div>
            <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setCurrentPage(1); }}>
              <option value="">All</option>
              {uniqueFroms.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location To</div>
            <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterTo} onChange={e => { setFilterTo(e.target.value); setCurrentPage(1); }}>
              <option value="">All</option>
              {uniqueTos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {!isReadOnly() && (
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                )}
                <th>#</th><th>Transfer Date</th><th>Invoice No.</th><th>Item Name</th>
                <th>Brand</th><th>Trade Name</th><th>Qty</th><th>Location From</th><th>Location To</th>
                {!isReadOnly() && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={11}><div className="empty-state">No outward entries found.</div></td></tr>
              ) : (
                paginated.map((item, i) => (
                  <tr id={`outward-row-${item.id}`} key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
                    {!isReadOnly() && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                    )}
                    <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + i + 1}</td>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.transfer_date}</td>
                    <td><code>{item.invoice_no || "—"}</code></td>
                    <td>{item.item_name || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                    <td>{item.brand || "—"}</td>
                    <td>{item.trade_name ? <span className="badge badge-purple">{item.trade_name}</span> : "—"}</td>
                    <td><span className="badge badge-blue" style={{ fontWeight: 700 }}>{item.qty ?? "—"}</span></td>
                    <td>{item.warehouse_from || "—"}</td>
                    <td>{item.warehouse_to || "—"}</td>
                    {!isReadOnly() && (
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}><FiEdit2 size={13} /></button>
                          {deleteConfirmId === item.id ? (
                            <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                              Sure?
                              <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteEntry(item.id)}><FiCheck size={13} /></button>
                              <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                            </span>
                          ) : (
                            <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }}
                              onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}>
                              <FiTrash2 size={13} />
                            </button>
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
  );
}

/* ─────────────────────────────────────────────
   Available Stock Sub-Component
───────────────────────────────────────────── */
function AvailableStockSection() {
  const [kits, setKits] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [inward, setInward] = useState([]);
  const [outward, setOutward] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [rKits, rDisp, rInw, rOutw] = await Promise.all([
          api.get("/kits"),
          api.get("/dispatch"),
          api.get("/inventory-inward"),
          api.get("/inventory-outward")
        ]);
        setKits(rKits.data);
        setDispatches(rDisp.data);
        setInward(rInw.data);
        setOutward(rOutw.data);
      } catch (e) {
        console.error("Failed to load available stock data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Aggregating logic
  const allTrades = Array.from(new Set([
    ...kits.map(k => k.trade),
    ...dispatches.map(d => d.trade),
    ...inward.map(i => i.trade_name),
    ...outward.map(o => o.trade_name),
    ...TRADE_OPTIONS
  ])).filter(Boolean);

  const stockData = allTrades.map(trade => {
    // 1. Kits logic
    const inwardKits = kits.filter(k => k.trade === trade).reduce((sum, k) => sum + (k.quantity || 0), 0);
    const outwardKits = dispatches.filter(d => d.trade === trade).reduce((sum, d) => sum + (d.quantity || 0), 0);
    const availableKits = inwardKits - outwardKits;

    // 2. Items logic under this trade
    const inwardItems = inward.filter(i => i.trade_name === trade);
    const outwardItems = outward.filter(o => o.trade_name === trade);

    const allItemNames = Array.from(new Set([
      ...inwardItems.map(i => i.item_name),
      ...outwardItems.map(o => o.item_name)
    ])).filter(Boolean);

    const items = allItemNames.map(itemName => {
      const inQty = inwardItems.filter(i => i.item_name === itemName).reduce((sum, i) => sum + (i.received_qty || 0), 0);
      const outQty = outwardItems.filter(o => o.item_name === itemName).reduce((sum, o) => sum + (o.qty || 0), 0);
      return {
        name: itemName,
        inQty,
        outQty,
        available: inQty - outQty
      };
    });

    return {
      trade,
      inwardKits,
      outwardKits,
      availableKits,
      items
    };
  }).filter(t => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return t.trade.toLowerCase().includes(s) || t.items.some(i => i.name.toLowerCase().includes(s));
  });

  if (loading) {
    return <div className="empty-state">Loading stock balance data...</div>;
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
          Trade-wise Available Stock Balance
        </span>
        <div className="search-bar">
          <FiSearch size={14} />
          <input
            placeholder="Search Trade or Item Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {stockData.length === 0 ? (
        <div className="empty-state">No stock information found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {stockData.map((t, idx) => (
            <div key={idx} className="card" style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)", padding: "16px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>🛡️ {t.trade}</span>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Summary of toolkit parts & kit configurations</div>
                </div>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Kits Inward</div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{t.inwardKits}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Kits Outward</div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{t.outwardKits}</div>
                  </div>
                  <div style={{ textAlign: "right", background: "var(--bg-muted)", padding: "4px 10px", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Kits Balance</div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: t.availableKits >= 0 ? "var(--success)" : "var(--danger)" }}>{t.availableKits}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px", overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>ITEM NAME</th>
                      <th>INWARD QUANTITY</th>
                      <th>OUTWARD QUANTITY</th>
                      <th>AVAILABLE STOCK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          No inward/outward item entries recorded for this trade.
                        </td>
                      </tr>
                    ) : (
                      t.items.map((item, itemIdx) => (
                        <tr key={itemIdx}>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</td>
                          <td><span className="badge badge-blue">{item.inQty}</span></td>
                          <td><span className="badge badge-orange">{item.outQty}</span></td>
                          <td>
                            <span className={`badge ${item.available >= 0 ? "badge-green" : "badge-red"}`} style={{ fontWeight: 700 }}>
                              {item.available}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Inventory Page
───────────────────────────────────────────── */
function Inventory() {
  const [activeTab, setActiveTab] = useState("inward");

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
            <h1 className="page-title">Inventory Management</h1>
            <p className="page-subtitle">Track inward stock receipts, outward stock transfers, and available balances</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "var(--bg-surface)", padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", width: "fit-content" }}>
          <button style={tabStyle("inward")} onClick={() => setActiveTab("inward")}>
            📥 Inward
          </button>
          <button style={tabStyle("outward")} onClick={() => setActiveTab("outward")}>
            📤 Outward / Stock Transfer
          </button>
          <button style={tabStyle("available")} onClick={() => setActiveTab("available")}>
            📦 Available Stock
          </button>
        </div>

        {activeTab === "inward" ? (
          <InwardSection />
        ) : activeTab === "outward" ? (
          <OutwardSection />
        ) : (
          <AvailableStockSection />
        )}

      </div>
    </div>
  );
}

export default Inventory;
