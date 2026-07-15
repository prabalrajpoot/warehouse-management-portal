import { useState, useEffect } from "react";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiDownload, FiUpload } from "react-icons/fi";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { isReadOnly, filterByWarehouse, isWarehouseManager, getWarehouseName } from "../utils/auth";

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

const mapFuzzyTradeAndSetType = (rawTrade) => {
  if (!rawTrade) return { trade: "", set_type: "" };
  const text = String(rawTrade).trim().toLowerCase();

  let trade = "";
  let setType = "";

  if (text.includes("set b") || text.endsWith(" b") || text.endsWith("b")) {
    setType = "SET B";
  } else if (text.includes("set a") || text.endsWith(" a") || text.endsWith("a")) {
    setType = "SET A";
  }

  if (text.includes("boat") || text.includes("boatmaker")) {
    trade = "Boat Maker";
  } else if (text.includes("baber") || text.includes("barber") || text.includes("naai")) {
    trade = "Barber (Naai)";
  } else if (text.includes("ht maker") || text.includes("hammer") || text.includes("toolkit")) {
    trade = "Hammer and ToolKit Maker";
    setType = "SET A";
  } else if (text.includes("fishing") || text.includes("fishingnet")) {
    trade = "Fishing Net Maker";
    setType = "SET A";
  } else if (text.includes("sculptor") || text.includes("moortikar")) {
    trade = "Sculptor (Moortikar)/Stone Carver/Stone Breaker";
    setType = "SET A";
  } else if (text.includes("metal") || text.includes("metalsmith")) {
    trade = "Metal Smith / Metal Caster";
    setType = "SET A";
  } else if (text.includes("potter") || text.includes("kumhar")) {
    trade = "Potter (Kumhar)";
    setType = "SET A";
  } else if (text.includes("washer") || text.includes("washerman") || text.includes("dhobi")) {
    trade = "Washerman (Dhobi)";
    setType = "SET A";
  } else if (text.includes("armourer")) {
    trade = "Armourer";
    setType = "SET A";
  }

  return { trade, set_type: setType };
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

function Inspection() {
  const [inspections, setInspections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  // Column filters
  const [filterDate, setFilterDate] = useState("");
  const [filterFirm, setFilterFirm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [filterTrade, setFilterTrade] = useState("");
  const [filterSetType, setFilterSetType] = useState("");
  const [filterInsNo, setFilterInsNo] = useState("");
  const [filterInsDate, setFilterInsDate] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterQtyMin, setFilterQtyMin] = useState("");
  const [filterQtyMax, setFilterQtyMax] = useState("");

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
  const [inspectionPassed, setInspectionPassed] = useState("Pass");
  const [inspectionNo, setInspectionNo] = useState("");
  const [insPassedDate, setInsPassedDate] = useState("");
  const [quantity, setQuantity] = useState("");

  // Edit states
  const [editId, setEditId] = useState(null);
  const [editCallDate, setEditCallDate] = useState("");
  const [editFirm, setEditFirm] = useState("");
  const [editWarehouseName, setEditWarehouseName] = useState(isWarehouseManager() ? getWarehouseName() : "");
  const [editTrade, setEditTrade] = useState("");
  const [editSetType, setEditSetType] = useState("");
  const [editInspectionPassed, setEditInspectionPassed] = useState("");
  const [editInspectionNo, setEditInspectionNo] = useState("");
  const [editInsPassedDate, setEditInsPassedDate] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchInspections(), fetchWarehouses()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchInspections = async () => {
    try {
      const r = await api.get("/inspection");
      setInspections(filterByWarehouse(r.data));
    } catch (e) {
      console.log(e);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const r = await api.get("/warehouses");
      setWarehouses(r.data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const findKey = (obj, aliases) => {
          const keys = Object.keys(obj);
          for (const alias of aliases) {
            const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === alias.toLowerCase().replace(/[^a-z0-9]/g, ""));
            if (match) return match;
          }
          return null;
        };

        const parseDateVal = (row, key) => {
          if (!key) return "";
          let rawDate = row[key];
          if (typeof rawDate === "number") {
            const dateObj = XLSX.SSF.parse_date_code(rawDate);
            const dd = String(dateObj.d).padStart(2, '0');
            const mm = String(dateObj.m).padStart(2, '0');
            const yyyy = dateObj.y;
            return `${dd}/${mm}/${yyyy}`;
          } else {
            const s = String(rawDate).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
              const parts = s.split("-");
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
              return s.replace(/-/g, "/");
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
              return s;
            }
            return s;
          }
        };

        const parsedRows = rows.map(row => {
          const dateKey = findKey(row, ["calldate", "date", "dateofcall", "call_date", "inspectioncompletedates", "inspectioncompletedate", "dispatchdates", "dispatchdate", "month"]);
          const dateVal = parseDateVal(row, dateKey);

          const insPassedDateKey = findKey(row, ["inspasseddate", "inspectionpasseddate", "passeddate", "ins_passed_date"]);
          const insPassedDateVal = parseDateVal(row, insPassedDateKey);

          const whKey = findKey(row, ["warehousename", "warehouse", "location", "warehouse_name", "pickuplocation"]);
          const whVal = whKey ? String(row[whKey]).trim() : "";

          const tradeKey = findKey(row, ["trade", "tradename", "workertype", "tradename"]);
          const tradeVal = tradeKey ? String(row[tradeKey]).trim() : "";

          const firmKey = findKey(row, ["firm", "company", "agency", "vendorname"]);
          const firmVal = firmKey ? String(row[firmKey]).trim() : "";

          const setTypeKey = findKey(row, ["settype", "set_type", "type", "typename"]);
          const setTypeVal = setTypeKey ? String(row[setTypeKey]).trim() : "";

          const passedKey = findKey(row, ["inspectionpassed", "passed", "status", "passedstatus", "inspection_passed"]);
          const passedVal = passedKey ? String(row[passedKey]).trim() : "Pass";

          const insNoKey = findKey(row, ["inspectionno", "inspectionnumber", "insno", "inspection_no"]);
          const insNoVal = insNoKey ? String(row[insNoKey]).trim() : "INS-BULK";

          const qtyKey = findKey(row, ["inspectedqty", "inspected", "inspectedquantity", "inspected quantity", "quantity", "qty", "count"]);
          const qtyVal = qtyKey ? Number(row[qtyKey]) : 0; // Default to 0 if no quantity matches

          // Map fuzzy trade and set type
          const mapped = mapFuzzyTradeAndSetType(tradeVal);
          const finalTrade = mapped.trade || tradeVal;
          const finalSetType = mapped.set_type || (setTypeVal ? setTypeVal.toUpperCase() : null);

          return {
            call_date: dateVal,
            firm: firmVal || null,
            warehouse_name: whVal || null,
            trade: finalTrade || null,
            set_type: finalSetType,
            inspection_passed: passedVal,
            inspection_no: insNoVal,
            ins_passed_date: insPassedDateVal || null,
            quantity: isNaN(qtyVal) ? 0 : qtyVal
          };
        }).filter(r => r.call_date && r.inspection_no && r.inspection_passed);

        if (parsedRows.length === 0) {
          alert("Could not parse any valid rows. Please check that Date, Inspection No, and Status (Pass/Fail) columns exist.");
          return;
        }

        if (!confirmImport) {
          setUploading(false);
          return;
        }

        await api.post("/inspection/bulk", parsedRows);
        alert(`Successfully imported ${parsedRows.length} historical inspection records!`);
        fetchInspections();
      } catch (err) {
        console.error(err);
        alert("An error occurred while parsing the file. Please ensure it is a valid Excel or CSV sheet.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const createInspection = async () => {
    if (!callDate || !inspectionPassed || !inspectionNo || !quantity) {
      setMsg("All fields are required.");
      return;
    }
    try {
      await api.post("/inspection", {
        call_date: toDMY(callDate),
        firm: firm || null,
        warehouse_name: warehouseName || null,
        trade: trade || null,
        set_type: setType || null,
        inspection_passed: inspectionPassed,
        inspection_no: inspectionNo,
        ins_passed_date: toDMY(insPassedDate) || null,
        quantity: Number(quantity)
      });
      setCallDate("");
      setFirm("");
      setWarehouseName(isWarehouseManager() ? getWarehouseName() : "");
      setTrade("");
      setSetType("");
      setInspectionPassed("Pass");
      setInspectionNo("");
      setInsPassedDate("");
      setQuantity("");
      setShowForm(false);
      setMsg("");
      fetchInspections();
    } catch {
      setMsg("Failed to save inspection entry.");
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditCallDate(toYMD(item.call_date));
    setEditFirm(item.firm || "");
    setEditWarehouseName(isWarehouseManager() ? getWarehouseName() : (item.warehouse_name || ""));
    setEditTrade(item.trade || "");
    setEditSetType(item.set_type || "");
    setEditInspectionPassed(item.inspection_passed);
    setEditInspectionNo(item.inspection_no);
    setEditInsPassedDate(toYMD(item.ins_passed_date));
    setEditQuantity(item.quantity);
    setShowForm(false);
    setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("inspection-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const updateInspection = async () => {
    if (!editCallDate || !editInspectionPassed || !editInspectionNo || !editQuantity) {
      alert("All required fields must be filled.");
      return;
    }
    try {
      await api.put(`/inspection/${editId}`, {
        call_date: toDMY(editCallDate),
        firm: editFirm || null,
        warehouse_name: editWarehouseName || null,
        trade: editTrade || null,
        set_type: editSetType || null,
        inspection_passed: editInspectionPassed,
        inspection_no: editInspectionNo,
        ins_passed_date: toDMY(editInsPassedDate) || null,
        quantity: Number(editQuantity)
      });
      const updatedId = editId;
      setEditId(null);
      fetchInspections();
      setTimeout(() => {
        const row = document.getElementById(`inspection-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch {
      alert("Failed to update inspection entry.");
    }
  };

  const deleteInspection = async (id) => {
    try {
      await api.delete(`/inspection/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchInspections();
    } catch {
      alert("Failed to delete inspection record.");
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/inspection/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchInspections();
    } catch {
      alert("Failed to delete selected inspection records.");
    }
  };

  const updateBulkResult = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkResult) {
      alert("Please select an inspection result to apply.");
      return;
    }
    if (!window.confirm(`Are you sure you want to update the result of ${selectedIds.length} inspections to '${bulkResult}'?`)) return;
    try {
      let dateVal = null;
      if (bulkResult === "Pass") {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        dateVal = `${dd}/${mm}/${yyyy}`;
      }
      await api.post("/inspection/update-result-bulk", {
        ids: selectedIds,
        result: bulkResult,
        ins_passed_date: dateVal
      });
      alert(`Successfully updated inspection result to '${bulkResult}'.`);
      setSelectedIds([]);
      setBulkResult("");
      fetchInspections();
    } catch {
      alert("Failed to update bulk inspection results.");
    }
  };

  const queueSelectedForDispatch = async () => {
    if (selectedIds.length === 0) return;
    const selectedIns = inspections.filter(i => selectedIds.includes(i.id));
    const passedIns = selectedIns.filter(i => i.inspection_passed === "Pass");
    if (passedIns.length === 0) {
      alert("None of the selected records are marked as 'Pass'. Only passed inspections can be queued for dispatch.");
      return;
    }
    
    if (!window.confirm(`Are you sure you want to queue ${passedIns.length} selected passed inspections for dispatch?`)) return;
    
    try {
      const payload = passedIns.map(item => ({
        call_date: item.ins_passed_date || item.call_date,
        firm: item.firm || null,
        warehouse_name: item.warehouse_name || "Main Hub",
        trade: item.trade || "General",
        set_type: item.set_type || null,
        quantity: item.quantity,
        ms_barcode: null,
        packaging_status: "Pending For Mark"
      }));
      await api.post("/dispatch/bulk", payload);
      alert(`Successfully queued ${passedIns.length} records for dispatch.`);
      setSelectedIds([]);
      fetchInspections();
    } catch {
      alert("Failed to queue selected records for dispatch.");
    }
  };

  const queueForDispatch = async (item) => {
    try {
      await api.post("/dispatch", {
        call_date: item.ins_passed_date || item.call_date,
        firm: item.firm || null,
        warehouse_name: item.warehouse_name || "Main Hub",
        trade: item.trade || "General",
        set_type: item.set_type || null,
        quantity: item.quantity,
        ms_barcode: null,
        packaging_status: "Pending For Mark"
      });
      alert(`Record for ${item.quantity} units queued for dispatch. Warehouse, Trade & Set Type auto-carried over.`);
    } catch {
      alert("Failed to queue record for dispatch.");
    }
  };

  const reQueueInspection = async (item) => {
    try {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const todayDMY = `${dd}/${mm}/${yyyy}`;

      await api.post("/inspection", {
        call_date: todayDMY,
        firm: item.firm || null,
        warehouse_name: item.warehouse_name || null,
        trade: item.trade || null,
        set_type: item.set_type || null,
        inspection_passed: "Pending",
        inspection_no: `RE-${item.inspection_no}`,
        ins_passed_date: null,
        quantity: item.quantity
      });
      alert(`Failed record for ${item.quantity} units successfully re-queued for next inspection.`);
      fetchInspections();
    } catch {
      alert("Failed to re-queue inspection.");
    }
  };

  // Unique values for dropdowns
  const myInspections = filterByWarehouse(inspections, "warehouse_name");
  const uniqueWarehouses = [...new Set(myInspections.map(i => i.warehouse_name).filter(Boolean))].sort();
  const uniqueTrades = [...new Set(myInspections.map(i => i.trade).filter(Boolean))].sort();

  const filtered = myInspections.filter((item) => {
    if (filterDate && !item.call_date.includes(filterDate)) return false;
    if (filterFirm && (item.firm || "").toLowerCase() !== filterFirm.toLowerCase()) return false;
    if (filterWarehouse && item.warehouse_name !== filterWarehouse) return false;
    if (filterTrade && item.trade !== filterTrade) return false;
    if (filterSetType && (item.set_type || "") !== filterSetType) return false;
    if (filterInsNo && !item.inspection_no.toLowerCase().includes(filterInsNo.toLowerCase())) return false;
    if (filterInsDate && !(item.ins_passed_date || "").includes(filterInsDate)) return false;
    if (filterResult && item.inspection_passed !== filterResult) return false;
    if (filterQtyMin !== "" && item.quantity < Number(filterQtyMin)) return false;
    if (filterQtyMax !== "" && item.quantity > Number(filterQtyMax)) return false;
    return true;
  });

  const clearFilters = () => {
    setFilterDate(""); setFilterFirm("");
    setFilterWarehouse(isWarehouseManager() ? getWarehouseName() : "");
    setFilterTrade("");
    setFilterSetType(""); setFilterInsNo(""); setFilterInsDate(""); setFilterResult("");
    setFilterQtyMin(""); setFilterQtyMax(""); setCurrentPage(1);
  };

  const hasActiveFilters = filterDate || filterFirm || filterWarehouse || filterTrade || filterSetType || filterInsNo || filterInsDate || filterResult || filterQtyMin !== "" || filterQtyMax !== "";

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
    doc.text("Inspection Records Report", 20, 20);
    doc.setFontSize(9);
    const headers = ["#", "Date", "Firm", "Warehouse", "Trade", "Set", "Ins. No", "Passed Date", "Result", "Inspected Qty"];
    doc.text(headers.join(" | "), 20, 32);
    doc.line(20, 35, 190, 35);
    let yPos = 42;
    filtered.forEach((item, idx) => {
      if (yPos > 280) { doc.addPage(); yPos = 20; }
      const row = [
        String(idx + 1),
        item.call_date,
        item.firm || "—",
        item.warehouse_name || "—",
        item.trade || "—",
        item.set_type || "—",
        item.inspection_no,
        item.ins_passed_date || "—",
        item.inspection_passed,
        String(item.quantity)
      ];
      doc.text(row.join(" | "), 20, yPos);
      yPos += 8;
    });
    doc.save("inspection_report.pdf");
  };

  const exportExcel = () => {
    const exportData = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Date": item.call_date,
      "Firm": item.firm || "—",
      "Warehouse Name": item.warehouse_name || "—",
      "Trade": item.trade || "—",
      "Set Type": item.set_type || "—",
      "Inspection No": item.inspection_no,
      "Ins. Passed Date": item.ins_passed_date || "—",
      "Result": item.inspection_passed,
      "Inspected Quantity": item.quantity
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inspections");
    XLSX.writeFile(wb, "inspection_report.xlsx");
  };

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Inspection Records</h1>
            <p className="page-subtitle">Track and audit warehouse kit inspections manually</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
                  id="inspection-file-input"
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => document.getElementById("inspection-file-input").click()}
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <FiUpload size={14} /> Upload Excel
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
                  <FiPlus size={14} /> {showForm ? "Cancel" : "Add Inspection Record"}
                </button>
              </>
            )}
          </div>
        </div>

      {uploading ? (
        <Loader message="Uploading and parsing inspection records from Excel..." />
      ) : loading ? (
        <Loader message="Loading inspection records..." />
      ) : (
        <>
          {/* Add Entry Card */}
        {showForm && !isReadOnly() && (
          <div className="card">
            <div className="card-title">New Inspection Entry</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Call Date</label>
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
                <label className="form-label">Trade</label>
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
                <label className="form-label">Inspection Passed?</label>
                <select className="form-select" value={inspectionPassed} onChange={(e) => setInspectionPassed(e.target.value)}>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Inspection Number</label>
                <input className="form-input" placeholder="e.g. INSP-901" value={inspectionNo} onChange={(e) => setInspectionNo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ins. Passed Date</label>
                <input className="form-input" type="date" value={insPassedDate} onChange={(e) => setInsPassedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Inspected Quantity</label>
                <input className="form-input" type="number" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            {msg && <div className="alert alert-error">{msg}</div>}
            <button className="btn btn-primary btn-sm" onClick={createInspection}>
              <FiCheck size={13} /> Save Record
            </button>
          </div>
        )}

        {/* Edit Entry Card */}
        {editId && (
          <div id="inspection-edit-form-container" className="card">
            <div className="card-title">Edit Record — ID #{editId}</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Call Date</label>
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
                <label className="form-label">Trade</label>
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
                <label className="form-label">Inspection Passed?</label>
                <select className="form-select" value={editInspectionPassed} onChange={(e) => setEditInspectionPassed(e.target.value)}>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Inspection Number</label>
                <input className="form-input" value={editInspectionNo} onChange={(e) => setEditInspectionNo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Ins. Passed Date</label>
                <input className="form-input" type="date" value={editInsPassedDate} onChange={(e) => setEditInsPassedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Inspected Quantity</label>
                <input className="form-input" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn btn-primary btn-sm" onClick={updateInspection}>
                <FiCheck size={13} /> Save Changes
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const prevId = editId;
                setEditId(null);
                setTimeout(() => {
                  const row = document.getElementById(`inspection-row-${prevId}`);
                  if (row) {
                    row.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }, 100);
              }}>
                <FiX size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* List Card */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              Inspection History ({filtered.length})
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {selectedIds.length > 0 && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <select 
                    className="form-select" 
                    style={{ height: "30px", fontSize: "12px", padding: "4px 8px", width: "150px", margin: 0 }}
                    value={bulkResult}
                    onChange={(e) => setBulkResult(e.target.value)}
                  >
                    <option value="">-- Bulk Result --</option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="Pending">Pending</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={updateBulkResult}>
                    Update Result
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={queueSelectedForDispatch} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    🚚 Queue Selected ({selectedIds.length})
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                    <FiTrash2 size={13} /> Delete Selected ({selectedIds.length})
                  </button>
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
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Call Date</div>
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
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Inspection No</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={filterInsNo} onChange={e => { setFilterInsNo(e.target.value); setCurrentPage(1); }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Ins. Passed Date</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterInsDate} onChange={e => { setFilterInsDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Result</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterResult} onChange={e => { setFilterResult(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Qty Min</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="number" placeholder="Min" value={filterQtyMin} onChange={e => { setFilterQtyMin(e.target.value); setCurrentPage(1); }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Qty Max</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="number" placeholder="Max" value={filterQtyMax} onChange={e => { setFilterQtyMax(e.target.value); setCurrentPage(1); }} />
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
                  <th>#</th>
                  <th>Call Date</th>
                  <th>Firm</th>
                  <th>Warehouse Name</th>
                  <th>Trade</th>
                  <th>Set Type</th>
                  <th>Inspection No</th>
                  <th>Ins. Passed Date</th>
                  <th>Result</th>
                  <th>Inspected Quantity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={12}><div className="empty-state">No inspection entries found.</div></td></tr>
                ) : (
                  paginated.map((item, i) => (
                    <tr id={`inspection-row-${item.id}`} key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + i + 1}</td>
                      <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.call_date}</td>
                      <td>{item.firm || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                      <td>{item.warehouse_name ? item.warehouse_name : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>{item.trade ? <span className="badge badge-purple">{item.trade}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td>{item.set_type ? <span className="badge badge-orange">{item.set_type}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      <td><code>{item.inspection_no}</code></td>
                      <td>{item.ins_passed_date || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>}</td>
                      <td>
                        <span className={`badge ${item.inspection_passed === "Pass"
                            ? "badge-green"
                            : item.inspection_passed === "Pending"
                              ? "badge-purple"
                              : "badge-red"
                          }`}>
                          {item.inspection_passed}
                        </span>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontWeight: "700" }}>{item.quantity}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {item.inspection_passed === "Pass" && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Queue for Dispatch"
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "var(--success)",
                                background: "rgba(16, 185, 129, 0.1)",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                              onClick={() => queueForDispatch(item)}
                            >
                              🚚 Dispatch
                            </button>
                          )}
                          {item.inspection_passed === "Fail" && (
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Re-queue for Next Inspection"
                              style={{
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "var(--accent)",
                                background: "var(--accent-soft)",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                              onClick={() => reQueueInspection(item)}
                            >
                              🔄 Re-inspect
                            </button>
                          )}
                          <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}>
                            <FiEdit2 size={13} />
                          </button>
                          {deleteConfirmId === item.id ? (
                            <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                              Sure?
                              <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteInspection(item.id)}>
                                <FiCheck size={13} />
                              </button>
                              <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}>
                                <FiX size={13} />
                              </button>
                            </span>
                          ) : (
                            <button
                              className="btn-icon"
                              title="Delete"
                              style={{ color: "var(--danger)" }}
                              onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}
                            >
                              <FiTrash2 size={13} />
                            </button>
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

      </div>
    </div>
  );
}

export default Inspection;