import { useState, useEffect } from "react";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiDownload, FiUpload, FiEye } from "react-icons/fi";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { isReadOnly, filterByWarehouse, isWarehouseManager, getWarehouseName, canDelete } from "../utils/auth";

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

const getAvailableSetTypes = (f, t) => {
  if (!f || !t) return [];
  if (f === "PTL") {
    if (t === "Boat Maker" || t === "Barber (Naai)") {
      return ["SET A", "SET B"];
    }
    return ["SET A"];
  }
  if (f === "ITI") {
    if (t === "Barber (Naai)") {
      return ["SET A", "SET B"];
    }
    return ["SET A"];
  }
  if (f === "VTL") {
    return ["SET A"];
  }
  return ["SET A", "SET B"];
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

/* ─────────────────────────────────────────────
   Dispatch Log Sub-Component
───────────────────────────────────────────── */
function DispatchLog() {
  const [dispatches, setDispatches] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");

  // Column filters
  const [filterDate, setFilterDate] = useState("");
  const [filterFirm, setFilterFirm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [filterTrade, setFilterTrade] = useState("");
  const [filterSetType, setFilterSetType] = useState("");
  const [filterBarcode, setFilterBarcode] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination & Selection states
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const pageSize = 50;

  // Form states
  const [callDate, setCallDate] = useState("");
  const [firm, setFirm] = useState("");
  const [warehouseName, setWarehouseName] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [trade, setTrade] = useState("");
  const [setType, setSetType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [msBarcode, setMsBarcode] = useState("");
  const [packagingStatus, setPackagingStatus] = useState("Pending For Mark");

  // Edit states
  const [editId, setEditId] = useState(null);
  const [editCallDate, setEditCallDate] = useState("");
  const [editFirm, setEditFirm] = useState("");
  const [editWarehouseName, setEditWarehouseName] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [editTrade, setEditTrade] = useState("");
  const [editSetType, setEditSetType] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editMsBarcode, setEditMsBarcode] = useState("");
  const [editPackagingStatus, setEditPackagingStatus] = useState("Pending For Mark");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchDispatches(), fetchWarehouses()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchDispatches = async () => {
    try { const r = await api.get("/dispatch"); setDispatches(filterByWarehouse(r.data)); }
    catch (e) { console.log(e); }
  };

  const fetchWarehouses = async () => {
    try {
      const r = await api.get("/warehouses");
      setWarehouses(r.data);
    } catch (e) {
      console.log(e);
    }
  };

  const createDispatch = async () => {
    if (!callDate || !warehouseName || !trade || !quantity) {
      setMsg("Date, Warehouse Name, Trade and Quantity are required."); return;
    }
    try {
      await api.post("/dispatch", {
        call_date: toDMY(callDate),
        firm: firm || null,
        warehouse_name: warehouseName,
        trade,
        set_type: setType || null,
        quantity: Number(quantity),
        ms_barcode: msBarcode || null,
        packaging_status: packagingStatus
      });
      setCallDate(""); setFirm(""); setWarehouseName(isWarehouseManager() ? getWarehouseName() : ""); setTrade(""); setSetType(""); setQuantity(""); setMsBarcode(""); setPackagingStatus("Pending For Mark");
      setShowForm(false); setMsg(""); fetchDispatches();
    } catch { setMsg("Failed to save dispatch entry."); }
  };

  const startEdit = (item) => {
    setEditId(item.id); setEditCallDate(toYMD(item.call_date)); setEditFirm(item.firm || "");
    setEditWarehouseName(isWarehouseManager() ? getWarehouseName() : item.warehouse_name); setEditTrade(item.trade);
    setEditSetType(item.set_type || ""); setEditQuantity(item.quantity);
    setEditMsBarcode(item.ms_barcode || "");
    setEditPackagingStatus(item.packaging_status || "Pending For Mark");
    setShowForm(false); setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("dispatch-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const updateDispatch = async () => {
    if (!editCallDate || !editWarehouseName || !editTrade || !editQuantity) { alert("Required fields missing."); return; }
    try {
      await api.put(`/dispatch/${editId}`, {
        call_date: toDMY(editCallDate),
        firm: editFirm || null,
        warehouse_name: editWarehouseName,
        trade: editTrade,
        set_type: editSetType || null,
        quantity: Number(editQuantity),
        ms_barcode: editMsBarcode || null,
        packaging_status: editPackagingStatus
      });
      const updatedId = editId;
      setEditId(null);
      fetchDispatches();
      setTimeout(() => {
        const row = document.getElementById(`dispatch-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch { alert("Failed to update dispatch record."); }
  };

  const deleteDispatch = async (id) => {
    try {
      await api.delete(`/dispatch/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchDispatches();
    }
    catch { alert("Failed to delete dispatch record."); }
  };

  const handleReturnDispatch = async (item) => {
    if (!window.confirm(`Are you sure you want to mark this dispatch (Firm: ${item.firm || 'N/A'}, Qty: ${item.quantity}) as Returned? It will be copied to the Return Logs.`)) return;
    try {
      // 1. Post to returns
      await api.post("/dispatch-return", {
        dispatched_date: item.call_date,
        firm: item.firm,
        warehouse_name: item.warehouse_name,
        trade: item.trade,
        set_type: item.set_type,
        quantity: item.quantity,
        ms_barcode: item.ms_barcode
      });

      // 2. Do NOT delete from dispatch as per request - keep in both tables

      // 3. Refresh lists
      fetchDispatches();
      alert("✅ Dispatch successfully copied to Return Logs!");
    } catch {
      alert("Failed to process return.");
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/dispatch/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchDispatches();
    } catch {
      alert("Failed to delete selected dispatch records.");
    }
  };

  const updateBulkStatus = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkStatus) {
      alert("Please select a status to apply.");
      return;
    }
    if (!window.confirm(`Are you sure you want to update the status of ${selectedIds.length} dispatches to '${bulkStatus}'?`)) return;
    try {
      await api.post("/dispatch/update-status-bulk", {
        ids: selectedIds,
        status: bulkStatus
      });
      alert("Successfully updated status.");
      setSelectedIds([]);
      fetchDispatches();
    } catch {
      alert("Failed to update status.");
    }
  };

  const markSelectedAsReturned = async () => {
    if (selectedIds.length === 0) return;
    const selectedDispatches = dispatches.filter(d => selectedIds.includes(d.id));
    if (!window.confirm(`Are you sure you want to copy ${selectedDispatches.length} selected dispatches to the Return Log?`)) return;
    try {
      const payload = selectedDispatches.map(item => ({
        dispatched_date: item.call_date,
        firm: item.firm || null,
        warehouse_name: item.warehouse_name || null,
        trade: item.trade || null,
        set_type: item.set_type || null,
        quantity: item.quantity,
        ms_barcode: item.ms_barcode || null
      }));
      await api.post("/dispatch-return/bulk", payload);
      alert(`Successfully copied ${selectedDispatches.length} entries to Return Logs.`);
      setSelectedIds([]);
      fetchDispatches();
    } catch {
      alert("Failed to copy records to Return Logs.");
    }
  };

  // Unique values for dropdowns
  const myDispatches = filterByWarehouse(dispatches, "warehouse_name");
  const uniqueWarehouses = [...new Set(myDispatches.map(d => d.warehouse_name).filter(Boolean))].sort();
  const uniqueTrades = [...new Set(myDispatches.map(d => d.trade).filter(Boolean))].sort();

  const filtered = myDispatches.filter((item) => {
    if (filterDate && !item.call_date.includes(filterDate)) return false;
    if (filterFirm && (item.firm || "").toLowerCase() !== filterFirm.toLowerCase()) return false;
    if (filterWarehouse && item.warehouse_name !== filterWarehouse) return false;
    if (filterTrade && item.trade !== filterTrade) return false;
    if (filterSetType && (item.set_type || "") !== filterSetType) return false;
    if (filterBarcode && !(item.ms_barcode || "").toLowerCase().includes(filterBarcode.toLowerCase())) return false;
    if (filterStatus && (item.packaging_status || "Pending For Mark") !== filterStatus) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(""); setFilterFirm("");
    setFilterWarehouse(isWarehouseManager() ? getWarehouseName() : "");
    setFilterTrade("");
    setFilterSetType(""); setFilterBarcode(""); setFilterStatus(""); setCurrentPage(1);
  };

  const hasActiveFilters = filterDate || filterFirm || filterWarehouse || filterTrade || filterSetType || filterBarcode || filterStatus;

  // Master Checkbox Logic
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(d => d.id));
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
    doc.text("Dispatch Logs Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Dispatched Date", "Firm", "Warehouse Name", "Trade", "Set", "Dispatched Qty", "MS No.", "Pkg Status"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.call_date,
        item.firm || "—",
        item.warehouse_name,
        item.trade,
        item.set_type || "—",
        String(item.quantity),
        item.ms_barcode || "—",
        item.packaging_status || "—"
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save("dispatch_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Dispatched Date": item.call_date,
      "Firm": item.firm || "—",
      "Warehouse Name": item.warehouse_name,
      "Trade": item.trade,
      "Set Type": item.set_type || "—",
      "Dispatched Quantity": item.quantity,
      "MS No. / Barcode": item.ms_barcode || "—",
      "Packaging Status": item.packaging_status || "—"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatches");
    XLSX.writeFile(wb, "dispatch_report.xlsx");
  };

  const uploadExcelFile = async (e) => {
    const file = e.target.files[0];
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

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/dispatch/upload", formData);
      alert("✅ Dispatches uploaded successfully!");
      fetchDispatches();
    } catch (err) {
      console.log(err);
      const msg = err.response?.data?.detail || "Upload failed. Please check Excel format.";
      alert(`❌ ${msg}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      {uploading ? (
        <Loader message="Uploading and processing dispatches Excel..." />
      ) : loading ? (
        <Loader message="Loading dispatches logs..." />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
              <FiDownload size={13} /> PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
              <FiDownload size={13} /> Excel
            </button>
            {!isReadOnly() && (
              <>
                <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FiUpload size={13} /> {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={uploadExcelFile}
                    disabled={uploading}
                  />
                </label>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
                  <FiPlus size={14} /> {showForm ? "Cancel" : "Add Dispatch Record"}
                </button>
              </>
            )}
          </div>

          {uploading && (
            <div className="alert" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "var(--accent)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
              <span>⏳ Processing and uploading Excel sheet records... Please wait, do not close the window.</span>
            </div>
          )}

          {showForm && !isReadOnly() && (
            <div className="card">
              <div className="card-title">New Dispatch Record</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Dispatched Date</label>
                  <input className="form-input" type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Firm</label>
                  <select className="form-select" value={firm} onChange={(e) => {
                    setFirm(e.target.value);
                    setTrade("");
                    setSetType("");
                  }}>
                    <option value="">— Select Firm —</option>
                    {FIRM_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <select className="form-select" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} disabled={isWarehouseManager()}>
                    {isWarehouseManager() ? (
                      <option value={getWarehouseName()}>{getWarehouseName()}</option>
                    ) : (
                      <>
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.name}>{w.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Category</label>
                  <select className="form-select" value={trade} onChange={(e) => {
                    const newTrade = e.target.value;
                    setTrade(newTrade);
                    const sets = getAvailableSetTypes(firm, newTrade);
                    if (sets.length === 1) {
                      setSetType(sets[0]);
                    } else {
                      setSetType("");
                    }
                  }} disabled={!firm}>
                    <option value="">{firm ? "— Select Trade —" : "— Select Firm First —"}</option>
                    {firm && FIRM_TRADE_MAP[firm]?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Set Type</label>
                  <select className="form-select" value={setType} onChange={(e) => setSetType(e.target.value)} disabled={!firm || !trade}>
                    <option value="">{firm && trade ? "— Select Set Type —" : "— Select Trade First —"}</option>
                    {getAvailableSetTypes(firm, trade).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatched Quantity</label>
                  <input className="form-input" type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MS No. / Barcode</label>
                  <input className="form-input" placeholder="e.g. MS-00123" value={msBarcode} onChange={(e) => setMsBarcode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Packaging Status</label>
                  <select className="form-select" value={packagingStatus} onChange={(e) => setPackagingStatus(e.target.value)}>
                    <option value="Pending For Mark">Pending For Mark</option>
                    <option value="Already In Transit">Already In Transit</option>
                    <option value="Dispatched">Dispatched</option>
                  </select>
                </div>
              </div>
              {msg && <div className="alert alert-error">{msg}</div>}
              <button className="btn btn-primary btn-sm" onClick={createDispatch}>
                <FiCheck size={13} /> Save Record
              </button>
            </div>
          )}

          {editId && (
            <div id="dispatch-edit-form-container" className="card">
              <div className="card-title">Edit Record — ID #{editId}</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Dispatched Date</label>
                  <input className="form-input" type="date" value={editCallDate} onChange={(e) => setEditCallDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Firm</label>
                  <select className="form-select" value={editFirm} onChange={(e) => {
                    setEditFirm(e.target.value);
                    setEditTrade("");
                    setEditSetType("");
                  }}>
                    <option value="">— Select Firm —</option>
                    {FIRM_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <select className="form-select" value={editWarehouseName} onChange={(e) => setEditWarehouseName(e.target.value)} disabled={isWarehouseManager()}>
                    {isWarehouseManager() ? (
                      <option value={getWarehouseName()}>{getWarehouseName()}</option>
                    ) : (
                      <>
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.name}>{w.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Category</label>
                  <select className="form-select" value={editTrade} onChange={(e) => {
                    const newTrade = e.target.value;
                    setEditTrade(newTrade);
                    const sets = getAvailableSetTypes(editFirm, newTrade);
                    if (sets.length === 1) {
                      setEditSetType(sets[0]);
                    } else {
                      setEditSetType("");
                    }
                  }} disabled={!editFirm}>
                    <option value="">{editFirm ? "— Select Trade —" : "— Select Firm First —"}</option>
                    {editFirm && FIRM_TRADE_MAP[editFirm]?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Set Type</label>
                  <select className="form-select" value={editSetType} onChange={(e) => setEditSetType(e.target.value)} disabled={!editFirm || !editTrade}>
                    <option value="">{editFirm && editTrade ? "— Select Set Type —" : "— Select Trade First —"}</option>
                    {getAvailableSetTypes(editFirm, editTrade).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatched Quantity</label>
                  <input className="form-input" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MS No. / Barcode</label>
                  <input className="form-input" value={editMsBarcode} onChange={(e) => setEditMsBarcode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Packaging Status</label>
                  <select className="form-select" value={editPackagingStatus} onChange={(e) => setEditPackagingStatus(e.target.value)}>
                    <option value="Pending For Mark">Pending For Mark</option>
                    <option value="Already In Transit">Already In Transit</option>
                    <option value="Dispatched">Dispatched</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn btn-primary btn-sm" onClick={updateDispatch}><FiCheck size={13} /> Save Changes</button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const prevId = editId;
                  setEditId(null);
                  setTimeout(() => {
                    const row = document.getElementById(`dispatch-row-${prevId}`);
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
              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Dispatch Logs ({filtered.length})</span>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {selectedIds.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <select
                      className="form-select"
                      style={{ height: "30px", fontSize: "12px", padding: "4px 8px", width: "160px", margin: 0 }}
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value)}
                    >
                      <option value="">-- Bulk Pkg Status --</option>
                      <option value="Pending For Mark">Pending For Mark</option>
                      <option value="Already In Transit">Already In Transit</option>
                      <option value="Dispatched">Dispatched</option>
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={updateBulkStatus}>
                      Update Status ({selectedIds.length})
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={markSelectedAsReturned} style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>
                      🔄 Return Selected ({selectedIds.length})
                    </button>
                    {canDelete() && (
                      <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                        <FiTrash2 size={13} /> Delete Selected ({selectedIds.length})
                      </button>
                    )}
                  </div>
                )}
                {hasActiveFilters && (
                  <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
                    <FiX size={12} /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px", marginBottom: "14px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</div>
                <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Firm</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterFirm} onChange={e => { setFilterFirm(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  {FIRM_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Warehouse</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setCurrentPage(1); }} disabled={isWarehouseManager()}>
                  {isWarehouseManager() ? (
                    <option value={getWarehouseName()}>{getWarehouseName()}</option>
                  ) : (
                    <>
                      <option value="">All</option>
                      {uniqueWarehouses.map(w => <option key={w} value={w}>{w}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterTrade} onChange={e => { setFilterTrade(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  {uniqueTrades.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Set Type</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterSetType} onChange={e => { setFilterSetType(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  <option value="SET A">SET A</option>
                  <option value="SET B">SET B</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>MS No./Barcode</div>
                <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterBarcode} onChange={e => { setFilterBarcode(e.target.value); setCurrentPage(1); }} />
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pkg Status</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Pending For Mark">Pending For Mark</option>
                  <option value="Already In Transit">Already In Transit</option>
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
                    <th>#</th><th>Dispatched Date</th><th>Firm</th><th>Warehouse Name</th><th>Trade</th><th>Set Type</th><th>Dispatched Quantity</th><th>MS No./Barcode</th><th>Pkg Status</th>
                    {!isReadOnly() && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={11}><div className="empty-state">No dispatch logs found.</div></td></tr>
                  ) : (
                    paginated.map((item, i) => (
                      <tr id={`dispatch-row-${item.id}`} key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
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
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.call_date}</td>
                        <td>{item.firm || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                        <td>{item.warehouse_name ? item.warehouse_name : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        <td>{item.trade ? <span className="badge badge-purple">{item.trade}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        <td>{item.set_type ? <span className="badge badge-orange">{item.set_type}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        <td><span className="badge badge-blue" style={{ fontWeight: "700" }}>{item.quantity}</span></td>
                        <td><code>{item.ms_barcode || "—"}</code></td>
                        <td>
                          <span className={`badge ${item.packaging_status === "Dispatched" ? "badge-green" :
                            item.packaging_status === "Already In Transit" ? "badge-blue" :
                              "badge-orange"
                            }`}>
                            {item.packaging_status || "Pending For Mark"}
                          </span>
                        </td>
                        {!isReadOnly() && (
                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}><FiEdit2 size={13} /></button>
                              <button
                                className="btn-icon"
                                style={{ color: "#3b82f6", cursor: "pointer", display: "flex", alignItems: "center" }}
                                title="Mark as Returned (Move to Return Log)"
                                onClick={() => handleReturnDispatch(item)}
                              >
                                🔄
                              </button>
                              {canDelete() && (
                                deleteConfirmId === item.id ? (
                                  <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                    Sure?
                                    <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteDispatch(item.id)}><FiCheck size={13} /></button>
                                    <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                                  </span>
                                ) : (
                                  <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }}
                                    onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}>
                                    <FiTrash2 size={13} />
                                  </button>
                                )
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
    </>
  );
}

/* ─────────────────────────────────────────────
   Return Sub-Component
───────────────────────────────────────────── */
function ReturnLog() {
  const [returns, setReturns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          setMsg("❌ Excel sheet has no data records.");
          return;
        }

        const parseExcelDate = (val) => {
          if (!val) return "";
          if (typeof val === 'number') {
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          }
          const str = String(val).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const parts = str.split("-");
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            return str;
          }
          return str;
        };

        const payload = jsonData.map((row) => {
          let dateVal = "";
          let firmVal = "";
          let whVal = "";
          let tradeVal = "";
          let setVal = "";
          let qtyVal = 1;
          let barcodeVal = "";

          Object.keys(row).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes("date")) {
              dateVal = parseExcelDate(row[key]);
            } else if (lowerKey.includes("firm") || lowerKey.includes("vendor")) {
              firmVal = String(row[key]).trim().toUpperCase();
            } else if (lowerKey.includes("warehouse") || lowerKey.includes("location") || lowerKey.includes("site")) {
              whVal = String(row[key]).trim();
            } else if (lowerKey.includes("trade")) {
              tradeVal = String(row[key]).trim();
            } else if (lowerKey.includes("set") || lowerKey.includes("type")) {
              setVal = String(row[key]).trim().toUpperCase();
            } else if (lowerKey.includes("qty") || lowerKey.includes("quantity") || lowerKey.includes("units")) {
              const parsedQty = parseInt(row[key], 10);
              qtyVal = isNaN(parsedQty) ? 1 : parsedQty;
            } else if (
              lowerKey.includes("barcode") ||
              lowerKey.includes("ms") ||
              lowerKey.includes("serial") ||
              lowerKey.includes("label")
            ) {
              barcodeVal = String(row[key]).trim();
            }
          });

          return {
            dispatched_date: dateVal || new Date().toLocaleDateString("en-GB"),
            firm: firmVal || null,
            warehouse_name: whVal || null,
            trade: tradeVal || null,
            set_type: setVal || null,
            quantity: qtyVal,
            ms_barcode: barcodeVal || null
          };
        });

        if (!window.confirm(`Do you want to upload ${payload.length} return records parsed from Excel?`)) {
          setUploading(false);
          e.target.value = "";
          return;
        }

        const r = await api.post("/dispatch-return/bulk", payload);
        setMsg(`✅ ${r.data.message || "Imported successfully!"}`);
        fetchReturns();
      } catch (err) {
        console.error(err);
        setMsg(`❌ Failed to import returns: ${err.response?.data?.detail || err.message}`);
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Column filters
  const [filterDate, setFilterDate] = useState("");
  const [filterFirm, setFilterFirm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [filterTrade, setFilterTrade] = useState("");
  const [filterSetType, setFilterSetType] = useState("");
  const [filterBarcode, setFilterBarcode] = useState("");

  // Pagination & Selection states
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const pageSize = 50;

  // Form states
  const [dispatchedDate, setDispatchedDate] = useState("");
  const [firm, setFirm] = useState("");
  const [warehouseName, setWarehouseName] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [trade, setTrade] = useState("");
  const [setType, setSetType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [msBarcode, setMsBarcode] = useState("");

  // Edit states
  const [editId, setEditId] = useState(null);
  const [editDispatchedDate, setEditDispatchedDate] = useState("");
  const [editFirm, setEditFirm] = useState("");
  const [editWarehouseName, setEditWarehouseName] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [editTrade, setEditTrade] = useState("");
  const [editSetType, setEditSetType] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editMsBarcode, setEditMsBarcode] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchReturns(), fetchWarehouses()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchReturns = async () => {
    try { const r = await api.get("/dispatch-return"); setReturns(filterByWarehouse(r.data)); }
    catch (e) { console.log(e); }
  };

  const fetchWarehouses = async () => {
    try {
      const r = await api.get("/warehouses");
      setWarehouses(r.data);
    } catch (e) {
      console.log(e);
    }
  };

  const createReturn = async () => {
    if (!dispatchedDate) { setMsg("Return Date is required."); return; }
    try {
      await api.post("/dispatch-return", {
        dispatched_date: toDMY(dispatchedDate),
        firm: firm || null,
        warehouse_name: warehouseName || null,
        trade: trade || null,
        set_type: setType || null,
        quantity: Number(quantity) || 1,
        ms_barcode: msBarcode || null
      });
      setDispatchedDate(""); setFirm(""); setWarehouseName(isWarehouseManager() ? getWarehouseName() : ""); setTrade(""); setSetType(""); setQuantity(""); setMsBarcode("");
      setShowForm(false); setMsg(""); fetchReturns();
    } catch { setMsg("Failed to save return entry."); }
  };

  const startEditReturn = (item) => {
    setEditId(item.id);
    setEditDispatchedDate(toYMD(item.dispatched_date));
    setEditFirm(item.firm || "");
    setEditWarehouseName(isWarehouseManager() ? getWarehouseName() : (item.warehouse_name || ""));
    setEditTrade(item.trade || "");
    setEditSetType(item.set_type || "");
    setEditQuantity(item.quantity || 1);
    setEditMsBarcode(item.ms_barcode || "");
    setShowForm(false);
    setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("return-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const updateReturn = async () => {
    if (!editDispatchedDate) { alert("Return Date is required."); return; }
    try {
      await api.put(`/dispatch-return/${editId}`, {
        dispatched_date: toDMY(editDispatchedDate),
        firm: editFirm || null,
        warehouse_name: editWarehouseName || null,
        trade: editTrade || null,
        set_type: editSetType || null,
        quantity: Number(editQuantity) || 1,
        ms_barcode: editMsBarcode || null
      });
      const updatedId = editId;
      setEditId(null);
      fetchReturns();
      setTimeout(() => {
        const row = document.getElementById(`return-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch { alert("Failed to update return entry."); }
  };

  const deleteReturn = async (id) => {
    try {
      await api.delete(`/dispatch-return/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchReturns();
    }
    catch { alert("Failed to delete return entry."); }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/dispatch-return/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchReturns();
    } catch {
      alert("Failed to delete selected return records.");
    }
  };

  // Unique values for dropdowns
  const myReturns = filterByWarehouse(returns, "warehouse_name");
  const uniqueWarehouses = [...new Set(myReturns.map(r => r.warehouse_name).filter(Boolean))].sort();
  const uniqueTrades = [...new Set(myReturns.map(r => r.trade).filter(Boolean))].sort();

  const filtered = myReturns.filter((item) => {
    if (filterDate && !(item.dispatched_date || "").includes(filterDate)) return false;
    if (filterFirm && (item.firm || "").toLowerCase() !== filterFirm.toLowerCase()) return false;
    if (filterWarehouse && (item.warehouse_name || "") !== filterWarehouse) return false;
    if (filterTrade && (item.trade || "") !== filterTrade) return false;
    if (filterSetType && (item.set_type || "") !== filterSetType) return false;
    if (filterBarcode && !(item.ms_barcode || "").toLowerCase().includes(filterBarcode.toLowerCase())) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(""); setFilterFirm("");
    setFilterWarehouse(isWarehouseManager() ? getWarehouseName() : "");
    setFilterTrade("");
    setFilterSetType(""); setFilterBarcode(""); setCurrentPage(1);
  };

  const hasActiveFilters = filterDate || filterFirm || filterWarehouse || filterTrade || filterSetType || filterBarcode;

  // Master Checkbox Logic
  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r.id));
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
    doc.text("Dispatch Return Logs Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Return Date", "Firm", "Warehouse Name", "Trade", "Set Type", "Qty", "MS No. / Barcode"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.dispatched_date,
        item.firm || "—",
        item.warehouse_name || "—",
        item.trade || "—",
        item.set_type || "—",
        String(item.quantity || 1),
        item.ms_barcode || "—"
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save("returns_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Return Date": item.dispatched_date,
      "Firm": item.firm || "—",
      "Warehouse Name": item.warehouse_name || "—",
      "Trade": item.trade || "—",
      "Set Type": item.set_type || "—",
      "Quantity": item.quantity || 1,
      "MS No. / Barcode": item.ms_barcode || "—"
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Returns");
    XLSX.writeFile(wb, "returns_report.xlsx");
  };


  const uploadExcelFile = (e) => {
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

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert("The uploaded Excel file appears to be empty.");
          setUploading(false);
          return;
        }

        const findKey = (obj, aliases) => {
          const keys = Object.keys(obj);
          for (const alias of aliases) {
            const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
            if (match) return match;
          }
          return null;
        };

        const parsedRows = rows.map(row => {
          const dateKey = findKey(row, ["returndate", "dispatcheddate", "date", "dispatched_date", "return_date"]);
          let dateVal = "";
          if (dateKey) {
            let rawDate = row[dateKey];
            if (typeof rawDate === "number") {
              const dateObj = XLSX.SSF.parse_date_code(rawDate);
              const dd = String(dateObj.d).padStart(2, '0');
              const mm = String(dateObj.m).padStart(2, '0');
              const yyyy = dateObj.y;
              dateVal = `${dd}/${mm}/${yyyy}`;
            } else {
              const s = String(rawDate).trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const parts = s.split("-");
                dateVal = `${parts[2]}/${parts[1]}/${parts[0]}`;
              } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
                dateVal = s.replace(/-/g, "/");
              } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
                dateVal = s;
              } else {
                dateVal = s;
              }
            }
          }

          const whKey = findKey(row, ["warehousename", "warehouse", "location", "warehouse_name"]);
          const whVal = whKey ? String(row[whKey]).trim() : "";

          const tradeKey = findKey(row, ["trade", "tradename", "trade_name"]);
          const tradeVal = tradeKey ? String(row[tradeKey]).trim() : "";

          const firmKey = findKey(row, ["firm", "company", "firm_name"]);
          const firmVal = firmKey ? String(row[firmKey]).trim() : "";

          const setTypeKey = findKey(row, ["settype", "set_type", "type"]);
          const setTypeVal = setTypeKey ? String(row[setTypeKey]).trim() : "";

          const qtyKey = findKey(row, ["quantity", "qty", "count"]);
          const qtyVal = qtyKey ? Number(row[qtyKey]) : 1;

          const msKey = findKey(row, ["msbarcode", "barcode", "ms_barcode", "msno"]);
          const msVal = msKey ? String(row[msKey]).trim() : "";

          return {
            dispatched_date: dateVal,
            firm: firmVal || null,
            warehouse_name: whVal || null,
            trade: tradeVal || null,
            set_type: setTypeVal || null,
            quantity: isNaN(qtyVal) ? 1 : qtyVal,
            ms_barcode: msVal || null
          };
        }).filter(r => r.dispatched_date);

        if (parsedRows.length === 0) {
          alert("Could not parse any valid return rows. Please check that 'Return Date' or 'Date' column exists.");
          setUploading(false);
          return;
        }

        await api.post("/dispatch-return/bulk", parsedRows);
        alert(`✅ Successfully imported ${parsedRows.length} return record(s)!`);
        fetchReturns();
      } catch (err) {
        console.error(err);
        alert("Failed to process return Excel file.");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      {uploading ? (
        <Loader message="Importing return records from Excel..." />
      ) : loading ? (
        <Loader message="Loading returns logs..." />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
            <input
              type="file"
              id="return-excel-upload"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleExcelUpload}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById("return-excel-upload").click()}>
              <FiUpload size={13} /> Import Excel
            </button>
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
                  id="return-excel-input"
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv"
                  onChange={uploadExcelFile}
                  disabled={uploading}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => document.getElementById("return-excel-input").click()}
                  disabled={uploading}
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <FiUpload size={14} /> {uploading ? "Uploading Excel..." : "Upload Excel"}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }} disabled={uploading}>
                  <FiPlus size={14} /> {showForm ? "Cancel" : "Add Return Entry"}
                </button>
              </>
            )}
          </div>

          {uploading && (
            <div className="alert" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "var(--accent)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
              <span>⏳ Processing and uploading Excel sheet records... Please wait, do not close the window.</span>
            </div>
          )}

          {showForm && (
            <div className="card">
              <div className="card-title">New Return Entry</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Return Date</label>
                  <input className="form-input" type="date" value={dispatchedDate} onChange={(e) => setDispatchedDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Firm</label>
                  <select className="form-select" value={firm} onChange={(e) => {
                    setFirm(e.target.value);
                    setTrade("");
                    setSetType("");
                  }}>
                    <option value="">— Select Firm —</option>
                    {FIRM_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <select className="form-select" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} disabled={isWarehouseManager()}>
                    {isWarehouseManager() ? (
                      <option value={getWarehouseName()}>{getWarehouseName()}</option>
                    ) : (
                      <>
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.name}>{w.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Category</label>
                  <select className="form-select" value={trade} onChange={(e) => {
                    const newTrade = e.target.value;
                    setTrade(newTrade);
                    const sets = getAvailableSetTypes(firm, newTrade);
                    if (sets.length === 1) {
                      setSetType(sets[0]);
                    } else {
                      setSetType("");
                    }
                  }} disabled={!firm}>
                    <option value="">{firm ? "— Select Trade —" : "— Select Firm First —"}</option>
                    {firm && FIRM_TRADE_MAP[firm]?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Set Type</label>
                  <select className="form-select" value={setType} onChange={(e) => setSetType(e.target.value)} disabled={!firm || !trade}>
                    <option value="">{firm && trade ? "— Select Set Type —" : "— Select Trade First —"}</option>
                    {getAvailableSetTypes(firm, trade).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MS No. / Barcode</label>
                  <input className="form-input" placeholder="e.g. MS-00123" value={msBarcode} onChange={(e) => setMsBarcode(e.target.value)} />
                </div>
              </div>
              {msg && <div className="alert alert-error">{msg}</div>}
              <button className="btn btn-primary btn-sm" onClick={createReturn}><FiCheck size={13} /> Save Entry</button>
            </div>
          )}

          {editId && (
            <div id="return-edit-form-container" className="card">
              <div className="card-title">Edit Return Entry — ID #{editId}</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Return Date</label>
                  <input className="form-input" type="date" value={editDispatchedDate} onChange={(e) => setEditDispatchedDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Firm</label>
                  <select className="form-select" value={editFirm} onChange={(e) => {
                    setEditFirm(e.target.value);
                    setEditTrade("");
                    setEditSetType("");
                  }}>
                    <option value="">— Select Firm —</option>
                    {FIRM_OPTIONS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Name</label>
                  <select className="form-select" value={editWarehouseName} onChange={(e) => setEditWarehouseName(e.target.value)} disabled={isWarehouseManager()}>
                    {isWarehouseManager() ? (
                      <option value={getWarehouseName()}>{getWarehouseName()}</option>
                    ) : (
                      <>
                        <option value="">— Select Warehouse —</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.name}>{w.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Category</label>
                  <select className="form-select" value={editTrade} onChange={(e) => {
                    const newTrade = e.target.value;
                    setEditTrade(newTrade);
                    const sets = getAvailableSetTypes(editFirm, newTrade);
                    if (sets.length === 1) {
                      setEditSetType(sets[0]);
                    } else {
                      setEditSetType("");
                    }
                  }} disabled={!editFirm}>
                    <option value="">{editFirm ? "— Select Trade —" : "— Select Firm First —"}</option>
                    {editFirm && FIRM_TRADE_MAP[editFirm]?.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Set Type</label>
                  <select className="form-select" value={editSetType} onChange={(e) => setEditSetType(e.target.value)} disabled={!editFirm || !editTrade}>
                    <option value="">{editFirm && editTrade ? "— Select Set Type —" : "— Select Trade First —"}</option>
                    {getAvailableSetTypes(editFirm, editTrade).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">MS No. / Barcode</label>
                  <input className="form-input" value={editMsBarcode} onChange={(e) => setEditMsBarcode(e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn btn-primary btn-sm" onClick={updateReturn}><FiCheck size={13} /> Save Changes</button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const prevId = editId;
                  setEditId(null);
                  setTimeout(() => {
                    const row = document.getElementById(`return-row-${prevId}`);
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
              <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>Return Logs ({filtered.length})</span>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {selectedIds.length > 0 && canDelete() && (
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px", marginBottom: "14px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Return Date</div>
                <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Firm</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterFirm} onChange={e => { setFilterFirm(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  {FIRM_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Warehouse</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterWarehouse} onChange={e => { setFilterWarehouse(e.target.value); setCurrentPage(1); }} disabled={isWarehouseManager()}>
                  {isWarehouseManager() ? (
                    <option value={getWarehouseName()}>{getWarehouseName()}</option>
                  ) : (
                    <>
                      <option value="">All</option>
                      {uniqueWarehouses.map(w => <option key={w} value={w}>{w}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trade</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterTrade} onChange={e => { setFilterTrade(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  {uniqueTrades.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Set Type</div>
                <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterSetType} onChange={e => { setFilterSetType(e.target.value); setCurrentPage(1); }}>
                  <option value="">All</option>
                  <option value="SET A">SET A</option>
                  <option value="SET B">SET B</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>MS No./Barcode</div>
                <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterBarcode} onChange={e => { setFilterBarcode(e.target.value); setCurrentPage(1); }} />
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th>#</th><th>Return Date</th><th>Firm</th><th>Warehouse Name</th><th>Trade</th><th>Set Type</th><th>Quantity</th><th>MS No./Barcode</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={10}><div className="empty-state">No return entries found.</div></td></tr>
                  ) : (
                    paginated.map((item, i) => (
                      <tr id={`return-row-${item.id}`} key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelectRow(item.id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + i + 1}</td>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.dispatched_date}</td>
                        <td>{item.firm || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                        <td>{item.warehouse_name || "—"}</td>
                        <td>{item.trade ? <span className="badge badge-purple">{item.trade}</span> : "—"}</td>
                        <td>{item.set_type ? <span className="badge badge-orange">{item.set_type}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                        <td><span className="badge badge-blue" style={{ fontWeight: "700" }}>{item.quantity || 1}</span></td>
                        <td><code>{item.ms_barcode || "—"}</code></td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button className="btn-icon" title="Edit" onClick={() => startEditReturn(item)}><FiEdit2 size={13} /></button>
                            {canDelete() && (
                              deleteConfirmId === item.id ? (
                                <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                  Sure?
                                  <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteReturn(item.id)}><FiCheck size={13} /></button>
                                  <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                                </span>
                              ) : (
                                <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }}
                                  onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}>
                                  <FiTrash2 size={13} />
                                </button>
                              )
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
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Main Dispatch Page with Tabs
───────────────────────────────────────────── */
function Dispatch() {
  const [activeTab, setActiveTab] = useState("dispatch");

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

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dispatched Kit Records</h1>
            <p className="page-subtitle">Track dispatch logs and manage returned kits</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "var(--bg-surface)", padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", width: "fit-content" }}>
          <button style={tabStyle("dispatch")} onClick={() => setActiveTab("dispatch")}>
            🚚 Dispatch Log
          </button>
          <button style={tabStyle("return")} onClick={() => setActiveTab("return")}>
            🔄 Return
          </button>
        </div>

        {activeTab === "dispatch" ? <DispatchLog /> : <ReturnLog />}

      </div>
    </div>
  );
}

export default Dispatch;