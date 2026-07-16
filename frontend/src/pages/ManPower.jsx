import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiUpload, FiEye } from "react-icons/fi";
import * as XLSX from "xlsx";
import { isReadOnly, filterByWarehouse, isWarehouseManager, getWarehouseName, canDelete } from "../utils/auth";

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

const calculateDayAndMonth = (dateVal) => {
  if (!dateVal) return { day: "", month: "" };
  const parts = dateVal.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    const dateObj = new Date(year, month - 1, day);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return {
      day: days[dateObj.getDay()] || "",
      month: months[dateObj.getMonth()] || ""
    };
  }
  return { day: "", month: "" };
};

const parseExcelDate = (val) => {
  if (!val) return "";
  
  if (typeof val === 'number') {
    const dateObj = new Date((val - 25569) * 86400 * 1000);
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }
  
  const str = String(val).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\-]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${d}/${m}/${y}`;
  }
  
  return str;
};

const getDayAndMonthFromDMY = (dmyStr) => {
  if (!dmyStr) return { day: "", month: "" };
  const parts = dmyStr.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return {
      day: days[dateObj.getDay()] || "",
      month: months[dateObj.getMonth()] || ""
    };
  }
  return { day: "", month: "" };
};

const MANPOWER_LOCATIONS = [
  "Jaipur",
  "New Jaipur",
  "Ahmedabad (Stock Area)",
  "Ahmedabad (FMT)",
  "Bangalore (Stock Area)",
  "Bangalore (FMT)",
  "Raipur (FMT)",
  "Dadri (Stock Area)",
  "Hapur",
  "Bhubneshwar",
  "New Bhubneshwar",
  "Keonjhar",
  "Guwahati (Stock Area)",
  "Greater Noida",
  "Chennai"
];

function ManPower() {
  const [records, setRecords] = useState([]);
  const [warehouses] = useState(
    MANPOWER_LOCATIONS.map((name, idx) => ({ id: idx, name }))
  );
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDay, setFilterDay] = useState("");

  // Modal states
  const [modalType, setModalType] = useState(null); // 'permanent' | 'additional' | 'supervisor' | null
  const [modalSearch, setModalSearch] = useState("");
  const [modalWorkers, setModalWorkers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [editingWorkerName, setEditingWorkerName] = useState("");
  const [editingWorkerGovtId, setEditingWorkerGovtId] = useState("");

  // Sub-form states for adding manual worker
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerGovtId, setNewWorkerGovtId] = useState("");
  const [newWorkerDate, setNewWorkerDate] = useState("");
  const [newWorkerLocation, setNewWorkerLocation] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const emptyForm = {
    date: "",
    day: "",
    month: "",
    warehouse_location: isWarehouseManager() ? getWarehouseName() : "",
    permanent_manpower: "",
    additional_manpower: "",
    supervisor: "",
    overtime_hours: "",
    remarks: "",
    workers: []
  };

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchModalWorkers = async (type) => {
    if (!type) return;
    setModalLoading(true);
    try {
      const res = await api.get("/man-power/workers", {
        params: {
          role: type,
          location: filterLocation || undefined,
          month: filterMonth || undefined
        }
      });
      setModalWorkers(res.data);
    } catch (e) {
      console.error("Failed to fetch modal workers", e);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (modalType) {
      fetchModalWorkers(modalType);
    }
  }, [modalType, filterLocation, filterMonth]);

  useEffect(() => {
    if (modalType) {
      setShowAddForm(false);
      setNewWorkerName("");
      setNewWorkerGovtId("");
      setNewWorkerLocation(filterLocation || (warehouses[0]?.name || ""));
      setNewWorkerDate(new Date().toISOString().split("T")[0]);
    }
  }, [modalType, filterLocation, warehouses]);

  const fetchRecords = async () => {
    try {
      const res = await api.get("/man-power");
      setRecords(filterByWarehouse(res.data, "warehouse_location"));
    } catch (e) {
      console.error("Failed to fetch man power records:", e);
    }
  };



  const handleDateChange = (val, isEdit = false) => {
    const { day, month } = calculateDayAndMonth(val);
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        date: val,
        day,
        month
      }));
    } else {
      setForm(prev => ({
        ...prev,
        date: val,
        day,
        month
      }));
    }
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
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          alert("The uploaded file is empty.");
          return;
        }

        const findKey = (row, keywords) => {
          const keys = Object.keys(row);
          for (let k of keys) {
            const kl = k.toLowerCase().replace(/[\s_\(\)\/\-]/g, "");
            for (let kw of keywords) {
              if (kl.includes(kw.toLowerCase())) {
                return k;
              }
            }
          }
          return null;
        };

        const parsedRows = rows.map((row) => {
          const dateKey = findKey(row, ["date", "dt", "logdate", "daydate"]);
          const dateVal = dateKey ? parseExcelDate(row[dateKey]) : "";
          const { day, month } = getDayAndMonthFromDMY(dateVal);

          const whKey = findKey(row, ["warehouse", "location", "wh", "whlocation", "warehouselocation"]);
          const whVal = whKey ? String(row[whKey]).trim() : "";

          const permKey = findKey(row, ["fixed", "fixedmanpower", "permanent", "regular", "perm", "permanentmanpower"]);
          const permVal = permKey ? Number(row[permKey]) : 0;

          const addKey = findKey(row, ["additional", "temp", "contract", "additionalmanpower", "addl"]);
          const addVal = addKey ? Number(row[addKey]) : 0;

          const supKey = findKey(row, ["supervisor", "sup", "supervisors"]);
          const supVal = supKey ? Number(row[supKey]) : 0;

          const otKey = findKey(row, ["overtime", "ot", "overtimehrs", "othours", "overtimehours"]);
          const otVal = otKey ? Number(row[otKey]) : 0.0;

          const remKey = findKey(row, ["remarks", "remark", "notes", "comment"]);
          const remVal = remKey ? String(row[remKey]).trim() : "";

          return {
            date: dateVal,
            day,
            month,
            warehouse_location: whVal,
            permanent_manpower: isNaN(permVal) ? 0 : permVal,
            additional_manpower: isNaN(addVal) ? 0 : addVal,
            supervisor: isNaN(supVal) ? 0 : supVal,
            overtime_hours: isNaN(otVal) ? 0.0 : otVal,
            remarks: remVal
          };
        }).filter(r => r.date && r.warehouse_location);

        if (parsedRows.length === 0) {
          alert("Could not parse any valid rows. Please check that Date and Warehouse Location columns exist.");
          return;
        }

        const confirmImport = window.confirm(`Found ${parsedRows.length} valid rows. Import them now?`);
        if (!confirmImport) return;

        await api.post("/man-power/bulk", parsedRows);
        alert(`Successfully imported ${parsedRows.length} historical logs!`);
        fetchRecords();
      } catch (err) {
        console.error(err);
        alert("An error occurred while parsing the file. Please ensure it is a valid Excel or CSV sheet.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleCreate = async () => {
    if (!form.date || !form.warehouse_location || form.permanent_manpower === "" || form.additional_manpower === "" || form.supervisor === "" || form.overtime_hours === "") {
      setMsg("Please fill in all required fields (Date, Warehouse Location, Permanent, Additional, Supervisor, and Overtime).");
      return;
    }

    // Validate Aadhar uniqueness among non-empty values in the list
    const nonValAadhars = (form.workers || []).map(w => w.govt_id?.trim()).filter(Boolean);
    if (new Set(nonValAadhars).size !== nonValAadhars.length) {
      setMsg("Duplicate Aadhar Number found in the personnel allocation list.");
      return;
    }

    try {
      const payload = {
        date: toDMY(form.date),
        day: form.day,
        month: form.month,
        warehouse_location: form.warehouse_location,
        permanent_manpower: Number(form.permanent_manpower),
        additional_manpower: Number(form.additional_manpower),
        supervisor: Number(form.supervisor),
        overtime_hours: Number(form.overtime_hours),
        remarks: form.remarks || "",
        workers: form.workers || []
      };

      await api.post("/man-power", payload);
      setForm(emptyForm);
      setShowForm(false);
      setMsg("");
      fetchRecords();
    } catch (e) {
      setMsg(e.response?.data?.detail || "Failed to save man power entry.");
    }
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditForm({
      date: toYMD(item.date) || "",
      day: item.day || "",
      month: item.month || "",
      warehouse_location: isWarehouseManager() ? getWarehouseName() : (item.warehouse_location || ""),
      permanent_manpower: item.permanent_manpower ?? "",
      additional_manpower: item.additional_manpower ?? "",
      supervisor: item.supervisor ?? "",
      overtime_hours: item.overtime_hours ?? "",
      remarks: item.remarks || "",
      workers: item.workers ? [...item.workers] : []
    });
    setShowForm(false);
    setDeleteConfirmId(null);
    setTimeout(() => {
      const container = document.getElementById("manpower-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleCountChange = (role, newCountVal) => {
    const newCount = newCountVal === "" ? 0 : Number(newCountVal);
    setEditForm(prev => {
      const roleWorkers = (prev.workers || []).filter(w => w.role === role);
      const otherWorkers = (prev.workers || []).filter(w => w.role !== role);
      const diff = newCount - roleWorkers.length;
      
      let updatedRoleWorkers = [...roleWorkers];
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          updatedRoleWorkers.push({ id: null, name: "", govt_id: "", role });
        }
      } else if (diff < 0) {
        updatedRoleWorkers = updatedRoleWorkers.slice(0, newCount);
      }
      
      const key = role === "permanent" ? "permanent_manpower" : role === "additional" ? "additional_manpower" : "supervisor";
      return {
        ...prev,
        [key]: newCountVal,
        workers: [...otherWorkers, ...updatedRoleWorkers]
      };
    });
  };

  const handleNewCountChange = (role, newCountVal) => {
    const newCount = newCountVal === "" ? 0 : Number(newCountVal);
    setForm(prev => {
      const roleWorkers = (prev.workers || []).filter(w => w.role === role);
      const otherWorkers = (prev.workers || []).filter(w => w.role !== role);
      const diff = newCount - roleWorkers.length;
      
      let updatedRoleWorkers = [...roleWorkers];
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          updatedRoleWorkers.push({ id: null, name: "", govt_id: "", role });
        }
      } else if (diff < 0) {
        updatedRoleWorkers = updatedRoleWorkers.slice(0, newCount);
      }
      
      const key = role === "permanent" ? "permanent_manpower" : role === "additional" ? "additional_manpower" : "supervisor";
      return {
        ...prev,
        [key]: newCountVal,
        workers: [...otherWorkers, ...updatedRoleWorkers]
      };
    });
  };

  const handleUpdate = async () => {
    if (!editForm.date || !editForm.warehouse_location || editForm.permanent_manpower === "" || editForm.additional_manpower === "" || editForm.supervisor === "" || editForm.overtime_hours === "") {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate Aadhar uniqueness among non-empty values in the list
    const nonValAadhars = (editForm.workers || []).map(w => w.govt_id?.trim()).filter(Boolean);
    if (new Set(nonValAadhars).size !== nonValAadhars.length) {
      alert("Duplicate Aadhar Number found in the personnel allocation list.");
      return;
    }

    try {
      const payload = {
        date: toDMY(editForm.date),
        day: editForm.day,
        month: editForm.month,
        warehouse_location: editForm.warehouse_location,
        permanent_manpower: Number(editForm.permanent_manpower),
        additional_manpower: Number(editForm.additional_manpower),
        supervisor: Number(editForm.supervisor),
        overtime_hours: Number(editForm.overtime_hours),
        remarks: editForm.remarks || "",
        workers: editForm.workers || []
      };

      await api.put(`/man-power/${editId}`, payload);
      const updatedId = editId;
      setEditId(null);
      fetchRecords();

      // Highlight row
      setTimeout(() => {
        const row = document.getElementById(`manpower-row-${updatedId}`);
        if (row) {
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch (e) {
      alert("Failed to update man power entry.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/man-power/${id}`);
      setDeleteConfirmId(null);
      fetchRecords();
    } catch (e) {
      alert("Failed to delete entry.");
    }
  };

  const handleDeleteAll = async () => {
    const confirmDelete = window.confirm(
      "⚠️ WARNING: Are you sure you want to delete ALL man power logs? This action is permanent and cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const res = await api.delete("/man-power/all");
      alert(res.data.message || "All records deleted successfully.");
      setFilterLocation("");
      setFilterMonth("");
      fetchRecords();
    } catch (e) {
      console.error(e);
      alert("Failed to delete all records.");
    }
  };

  const handleEditWorker = async (workerId) => {
    if (!editingWorkerName.trim() || !editingWorkerGovtId.trim()) {
      alert("Name and Aadhar No./Govt. Id cannot be empty.");
      return;
    }
    try {
      await api.put(`/man-power/workers/${workerId}`, { 
        name: editingWorkerName,
        govt_id: editingWorkerGovtId
      });
      setEditingWorkerId(null);
      setEditingWorkerName("");
      setEditingWorkerGovtId("");
      fetchModalWorkers(modalType);
      fetchRecords(); // Refresh the counts on the dashboard table as well
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update worker.");
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerGovtId.trim() || !newWorkerDate || !newWorkerLocation) {
      alert("Please fill in all fields.");
      return;
    }

    const parts = newWorkerDate.split("-");
    if (parts.length !== 3) {
      alert("Invalid date format.");
      return;
    }
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    try {
      await api.post("/man-power/workers", {
        name: newWorkerName,
        govt_id: newWorkerGovtId,
        role: modalType,
        date: formattedDate,
        location: newWorkerLocation
      });
      
      setNewWorkerName("");
      setNewWorkerGovtId("");
      setShowAddForm(false);
      
      fetchModalWorkers(modalType);
      fetchRecords();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to add new worker.");
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm("Are you sure you want to delete this worker? This will decrement the headcount on the main record.")) return;
    try {
      await api.delete(`/man-power/workers/${workerId}`);
      fetchModalWorkers(modalType);
      fetchRecords();
    } catch (e) {
      alert("Failed to delete worker.");
    }
  };

  const handleDeleteAllWorkers = async () => {
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to delete ALL ${modalType} workers under the current filters? This will reset their headcounts to 0.`)) return;
    try {
      await api.delete("/man-power/workers/all", {
        params: {
          role: modalType,
          location: filterLocation || undefined,
          month: filterMonth || undefined
        }
      });
      setModalType(null); // Close the modal since all records are cleared
      fetchRecords();
    } catch (e) {
      alert("Failed to delete workers.");
    }
  };

  // Dynamic dropdown list options
  const uniqueLocations = Array.from(new Set(records.map(r => r.warehouse_location).filter(Boolean))).sort();
  const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const uniqueMonths = Array.from(new Set(records.map(r => r.month).filter(Boolean))).sort(
    (a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)
  );

  // Filter based on selectedLocation, selectedMonth, and column filters
  const filtered = records.filter(item => {
    if (filterLocation && item.warehouse_location !== filterLocation) return false;
    if (filterMonth && item.month !== filterMonth) return false;
    if (filterDate && !(item.date || "").includes(filterDate)) return false;
    if (filterDay && (item.day || "").toLowerCase() !== filterDay.toLowerCase()) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (
        !(item.warehouse_location || "").toLowerCase().includes(s) &&
        !(item.day || "").toLowerCase().includes(s) &&
        !(item.month || "").toLowerCase().includes(s) &&
        !(item.remarks || "").toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const clearAllFilters = () => {
    setSearch("");
    setFilterLocation(isWarehouseManager() ? getWarehouseName() : "");
    setFilterMonth(""); setFilterDate(""); setFilterDay(""); setCurrentPage(1);
  };

  const hasActiveFilters = search || filterLocation || filterMonth || filterDate || filterDay;

  // Calculate live sums based on filtered list
  const totalPermanent = filtered.reduce((sum, r) => sum + (r.permanent_manpower || 0), 0);
  const totalAdditional = filtered.reduce((sum, r) => sum + (r.additional_manpower || 0), 0);
  const totalSupervisor = filtered.reduce((sum, r) => sum + (r.supervisor || 0), 0);
  const totalOvertime = filtered.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            <h1 className="page-title">Man Power Tracking</h1>
            <p className="page-subtitle">Log and monitor workforce headcount allocation across warehouses</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!isReadOnly() && (
              <>
                <input
                  type="file"
                  id="manpower-file-input"
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => document.getElementById("manpower-file-input").click()}
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <FiUpload size={14} /> Upload Excel
                </button>
                {canDelete() && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ display: "flex", gap: "6px", alignItems: "center", color: "#ef4444", borderColor: "#fca5a5" }}
                    onClick={handleDeleteAll}
                  >
                    <FiTrash2 size={14} /> Delete All Logs
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(!showForm); setEditId(null); setMsg(""); }}>
                  <FiPlus size={14} /> {showForm ? "Cancel" : "Add Man Power Log"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* New entry form */}
        {showForm && !isReadOnly() && (
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-title">New Man Power Entry</div>
            <div className="form-grid" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Log Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date}
                  onChange={(e) => handleDateChange(e.target.value, false)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Day (Auto)</label>
                <input
                  className="form-input"
                  style={{ background: "var(--bg-muted)", cursor: "not-allowed" }}
                  type="text"
                  placeholder="Computed day"
                  value={form.day}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label className="form-label">Month (Auto)</label>
                <input
                  className="form-input"
                  style={{ background: "var(--bg-muted)", cursor: "not-allowed" }}
                  type="text"
                  placeholder="Computed month"
                  value={form.month}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Location *</label>
                <select
                  className="form-select"
                  value={form.warehouse_location}
                  onChange={(e) => setForm(f => ({ ...f, warehouse_location: e.target.value }))}
                  disabled={isWarehouseManager()}
                >
                  {isWarehouseManager() ? (
                    <option value={getWarehouseName()}>{getWarehouseName()}</option>
                  ) : (
                    <>
                      <option value="">--Select Warehouse--</option>
                      {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Permanent Manpower *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 10"
                  value={form.permanent_manpower}
                  onChange={(e) => handleNewCountChange("permanent", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Additional Manpower *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 5"
                  value={form.additional_manpower}
                  onChange={(e) => handleNewCountChange("additional", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor Count *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 2"
                  value={form.supervisor}
                  onChange={(e) => handleNewCountChange("supervisor", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Overtime (hrs) *</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={form.overtime_hours}
                  onChange={(e) => setForm(f => ({ ...f, overtime_hours: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Remarks</label>
                <input
                  className="form-input"
                  placeholder="Shift notes or other details"
                  value={form.remarks}
                  onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
                />
              </div>
            </div>

            {/* Personnel Allocation Section inside the creation form */}
            <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  👥 Personnel Details Allocation Directory
                </h4>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select 
                    id="new-entry-worker-role-select" 
                    className="form-select" 
                    style={{ width: "160px", height: "32px", padding: "0 8px", fontSize: "12px" }}
                  >
                    <option value="permanent">Permanent Worker</option>
                    <option value="additional">Additional Worker</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    style={{ height: "32px", padding: "0 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      const role = document.getElementById("new-entry-worker-role-select").value;
                      const newWorker = {
                        id: null,
                        name: "",
                        govt_id: "",
                        role: role
                      };
                      setForm(prev => {
                        const updatedWorkers = [...(prev.workers || []), newWorker];
                        const key = role === "permanent" ? "permanent_manpower" : role === "additional" ? "additional_manpower" : "supervisor";
                        return {
                          ...prev,
                          workers: updatedWorkers,
                          [key]: Number(prev[key] || 0) + 1
                        };
                      });
                    }}
                  >
                    <FiPlus size={12} /> Add Worker row
                  </button>
                </div>
              </div>

              {(!form.workers || form.workers.length === 0) ? (
                <div style={{ padding: "16px", background: "var(--bg-base)", borderRadius: "6px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No personnel allocated to this entry yet. Adjust headcounts or click "Add Worker row" above.
                </div>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <table className="data-table" style={{ margin: 0, fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "6px 12px" }}>Designation</th>
                        <th style={{ padding: "6px 12px" }}>Name</th>
                        <th style={{ padding: "6px 12px" }}>Aadhar Number</th>
                        <th style={{ padding: "6px 12px", width: "80px", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.workers.map((w, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "6px 12px" }}>
                            <span className={`badge badge-${w.role === "permanent" ? "green" : w.role === "additional" ? "orange" : "blue"}`} style={{ textTransform: "capitalize", fontSize: "11px", padding: "2px 6px" }}>
                              {w.role}
                            </span>
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "4px 8px", fontSize: "13px", height: "30px" }}
                              placeholder="Worker Name"
                              value={w.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm(prev => {
                                  const list = [...prev.workers];
                                  list[idx] = { ...list[idx], name: val };
                                  return { ...prev, workers: list };
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "4px 8px", fontSize: "13px", height: "30px", fontFamily: "monospace" }}
                              placeholder="Aadhar Number"
                              value={w.govt_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                setForm(prev => {
                                  const list = [...prev.workers];
                                  list[idx] = { ...list[idx], govt_id: val };
                                  return { ...prev, workers: list };
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center" }}>
                            <button 
                              type="button" 
                              className="btn btn-icon" 
                              style={{ color: "var(--danger)" }}
                              onClick={() => {
                                setForm(prev => {
                                  const list = prev.workers.filter((_, i) => i !== idx);
                                  const key = w.role === "permanent" ? "permanent_manpower" : w.role === "additional" ? "additional_manpower" : "supervisor";
                                  const newCount = Math.max(0, Number(prev[key] || 0) - 1);
                                  return {
                                    ...prev,
                                    workers: list,
                                    [key]: newCount
                                  };
                                });
                              }}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {msg && <div className="alert alert-error" style={{ marginBottom: "16px" }}>{msg}</div>}
            <button className="btn btn-primary btn-sm" onClick={handleCreate}><FiCheck size={13} /> Save Entry</button>
          </div>
        )}

        {/* Edit form card */}
        {editId && (
          <div id="manpower-edit-form-container" className="card" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                ✏️ Edit Man Power Entry — ID #{editId}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const prevId = editId;
                setEditId(null);
                setTimeout(() => {
                  const row = document.getElementById(`manpower-row-${prevId}`);
                  if (row) {
                    row.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }, 100);
              }}><FiX size={14} /> Cancel</button>
            </div>
            <div className="form-grid" style={{ marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Log Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => handleDateChange(e.target.value, true)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Day (Auto)</label>
                <input
                  className="form-input"
                  style={{ background: "var(--bg-muted)", cursor: "not-allowed" }}
                  type="text"
                  value={editForm.day}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label className="form-label">Month (Auto)</label>
                <input
                  className="form-input"
                  style={{ background: "var(--bg-muted)", cursor: "not-allowed" }}
                  type="text"
                  value={editForm.month}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Location *</label>
                <select
                  className="form-select"
                  value={editForm.warehouse_location}
                  onChange={(e) => setEditForm(f => ({ ...f, warehouse_location: e.target.value }))}
                  disabled={isWarehouseManager()}
                >
                  {isWarehouseManager() ? (
                    <option value={getWarehouseName()}>{getWarehouseName()}</option>
                  ) : (
                    <>
                      <option value="">--Select Warehouse--</option>
                      {warehouses.map(wh => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Permanent Manpower *</label>
                <input
                  className="form-input"
                  type="number"
                  value={editForm.permanent_manpower}
                  onChange={(e) => handleCountChange("permanent", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Additional Manpower *</label>
                <input
                  className="form-input"
                  type="number"
                  value={editForm.additional_manpower}
                  onChange={(e) => handleCountChange("additional", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor Count *</label>
                <input
                  className="form-input"
                  type="number"
                  value={editForm.supervisor}
                  onChange={(e) => handleCountChange("supervisor", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Overtime (hrs) *</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.5"
                  value={editForm.overtime_hours}
                  onChange={(e) => setEditForm(f => ({ ...f, overtime_hours: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Remarks</label>
                <input
                  className="form-input"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm(f => ({ ...f, remarks: e.target.value }))}
                />
              </div>
            </div>

            {/* Personnel Allocation Section inside the edit form */}
            <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "20px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  👥 Personnel Details Allocation Directory
                </h4>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <select 
                    id="new-worker-role-select" 
                    className="form-select" 
                    style={{ width: "160px", height: "32px", padding: "0 8px", fontSize: "12px" }}
                  >
                    <option value="permanent">Permanent Worker</option>
                    <option value="additional">Additional Worker</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    style={{ height: "32px", padding: "0 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      const role = document.getElementById("new-worker-role-select").value;
                      const newWorker = {
                        id: null,
                        name: "",
                        govt_id: "",
                        role: role
                      };
                      setEditForm(prev => {
                        const updatedWorkers = [...(prev.workers || []), newWorker];
                        const key = role === "permanent" ? "permanent_manpower" : role === "additional" ? "additional_manpower" : "supervisor";
                        return {
                          ...prev,
                          workers: updatedWorkers,
                          [key]: Number(prev[key] || 0) + 1
                        };
                      });
                    }}
                  >
                    <FiPlus size={12} /> Add Worker row
                  </button>
                </div>
              </div>

              {(!editForm.workers || editForm.workers.length === 0) ? (
                <div style={{ padding: "16px", background: "var(--bg-base)", borderRadius: "6px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No personnel allocated to this entry yet. Adjust headcounts or click "Add Worker row" above.
                </div>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                  <table className="data-table" style={{ margin: 0, fontSize: "13px" }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "6px 12px" }}>Designation</th>
                        <th style={{ padding: "6px 12px" }}>Name</th>
                        <th style={{ padding: "6px 12px" }}>Aadhar Number</th>
                        <th style={{ padding: "6px 12px", width: "80px", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editForm.workers.map((w, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "6px 12px" }}>
                            <span className={`badge badge-${w.role === "permanent" ? "green" : w.role === "additional" ? "orange" : "blue"}`} style={{ textTransform: "capitalize", fontSize: "11px", padding: "2px 6px" }}>
                              {w.role}
                            </span>
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "4px 8px", fontSize: "13px", height: "30px" }}
                              placeholder="Worker Name"
                              value={w.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm(prev => {
                                  const list = [...prev.workers];
                                  list[idx] = { ...list[idx], name: val };
                                  return { ...prev, workers: list };
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "4px 8px", fontSize: "13px", height: "30px", fontFamily: "monospace" }}
                              placeholder="Aadhar Number"
                              value={w.govt_id}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditForm(prev => {
                                  const list = [...prev.workers];
                                  list[idx] = { ...list[idx], govt_id: val };
                                  return { ...prev, workers: list };
                                });
                              }}
                            />
                          </td>
                          <td style={{ padding: "6px 12px", textAlign: "center" }}>
                            <button 
                              type="button" 
                              className="btn btn-icon" 
                              style={{ color: "var(--danger)" }}
                              onClick={() => {
                                setEditForm(prev => {
                                  const list = prev.workers.filter((_, i) => i !== idx);
                                  const key = w.role === "permanent" ? "permanent_manpower" : w.role === "additional" ? "additional_manpower" : "supervisor";
                                  const newCount = Math.max(0, Number(prev[key] || 0) - 1);
                                  return {
                                    ...prev,
                                    workers: list,
                                    [key]: newCount
                                  };
                                });
                              }}
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-sm" onClick={handleUpdate}><FiCheck size={13} /> Save Changes</button>
          </div>
        )}

        {/* Dynamic Filters & Metrics Cards */}
        <div className="card" style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Compact filter row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px", padding: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="e.g. 01/01/2025" value={filterDate} onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Day</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterDay} onChange={e => { setFilterDay(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Month</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Warehouse Location</div>
              <select className="form-select" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setCurrentPage(1); }} disabled={isWarehouseManager()}>
                {isWarehouseManager() ? (
                  <option value={getWarehouseName()}>{getWarehouseName()}</option>
                ) : (
                  <>
                    <option value="">All</option>
                    {MANPOWER_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </>
                )}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Search Remarks</div>
              <input className="form-input" style={{ height: "30px", fontSize: "12px", padding: "4px 8px" }} type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
            {hasActiveFilters && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ color: "var(--danger)", borderColor: "var(--danger)", height: "30px", width: "100%" }}>
                  <FiX size={12} /> Clear All
                </button>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px"
          }}>
            <div 
              className="interactive-stat-card"
              onClick={() => { setModalType("permanent"); setModalSearch(""); }}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px",
                display: "flex", flexDirection: "column", gap: "4px"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                ⚙️ Permanent Manpower (Fixed)
              </span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{totalPermanent}</span>
            </div>

            <div 
              className="interactive-stat-card"
              onClick={() => { setModalType("additional"); setModalSearch(""); }}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px",
                display: "flex", flexDirection: "column", gap: "4px"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                ⚡ Additional Manpower
              </span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{totalAdditional}</span>
            </div>

            <div 
              className="interactive-stat-card"
              onClick={() => { setModalType("supervisor"); setModalSearch(""); }}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px",
                display: "flex", flexDirection: "column", gap: "4px"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                👤 Total Supervisors
              </span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{totalSupervisor}</span>
            </div>

            <div style={{
              background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px",
              display: "flex", flexDirection: "column", gap: "4px"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                🕒 Total Overtime (hrs)
              </span>
              <span style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)" }}>{totalOvertime}</span>
            </div>
          </div>
        </div>

        {/* Records table */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              Man Power Allocation Logs ({filtered.length})
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>DATE</th>
                  <th>DAY</th>
                  <th>MONTH</th>
                  <th>WAREHOUSE LOCATION</th>
                  <th>PERMANENT</th>
                  <th>ADDITIONAL</th>
                  <th>SUPERVISOR</th>
                  <th>OVERTIME (HRS)</th>
                  <th>REMARKS</th>
                  {!isReadOnly() && <th>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <div className="empty-state">No man power logs found.</div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item, index) => (
                    <tr id={`manpower-row-${item.id}`} key={item.id}>
                      <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + index + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.date}</td>
                      <td><span className="badge badge-purple">{item.day}</span></td>
                      <td><span className="badge badge-blue">{item.month}</span></td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.warehouse_location}</td>
                      <td><span className="badge badge-green" style={{ fontWeight: 700 }}>{item.permanent_manpower}</span></td>
                      <td><span className="badge badge-orange" style={{ fontWeight: 700 }}>{item.additional_manpower}</span></td>
                      <td><span className="badge badge-blue" style={{ fontWeight: 700 }}>{item.supervisor}</span></td>
                      <td><span className="badge badge-red" style={{ fontWeight: 700 }}>{item.overtime_hours}</span></td>
                      <td>{item.remarks || "—"}</td>
                      {!isReadOnly() && (
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button className="btn-icon" title="Edit" onClick={() => startEdit(item)}><FiEdit2 size={13} /></button>
                            {canDelete() && (
                              deleteConfirmId === item.id ? (
                                <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                  Sure?
                                  <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDelete(item.id)}><FiCheck size={13} /></button>
                                  <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}><FiX size={13} /></button>
                                </span>
                              ) : (
                                <button className="btn-icon" title="Delete" style={{ color: "var(--danger)" }} onClick={() => { setDeleteConfirmId(item.id); setEditId(null); }}><FiTrash2 size={13} /></button>
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

        {/* Personnel names details modal */}
        {modalType && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              animation: "fadeIn 0.2s ease-out"
            }}
            onClick={() => setModalType(null)}
          >
            <div 
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                width: "90%",
                maxWidth: "780px",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                animation: "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)"
              }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", display: "flex", gap: "8px", alignItems: "center" }}>
                    {modalType === "permanent" ? "⚙️ Permanent" : modalType === "additional" ? "⚡ Additional" : "👤 Supervisor"} Personnel Directory
                  </h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Showing names list for active location/month filters
                  </p>
                </div>
                <button 
                  onClick={() => setModalType(null)}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-elevated)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Search & Export Toolbar */}
              <div style={{
                padding: "16px 24px",
                background: "var(--bg-base)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap"
              }}>
                <div style={{
                  position: "relative",
                  flex: 1,
                  minWidth: "220px"
                }}>
                  <FiSearch size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input 
                    placeholder="Search by Aadhar, name, date..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "13px"
                    }}
                  />
                  {modalSearch && (
                    <FiX 
                      size={14} 
                      onClick={() => setModalSearch("")} 
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", cursor: "pointer" }}
                    />
                  )}
                </div>
                
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const headers = ["Aadhar Number", "Name", "Role", "Date", "Location"];
                      const rows = modalWorkers.filter(w => {
                        const s = modalSearch.toLowerCase();
                        return (
                          (w.govt_id || "").toLowerCase().includes(s) ||
                          (w.name || "").toLowerCase().includes(s) ||
                          (w.location || "").toLowerCase().includes(s) ||
                          (w.date || "").toLowerCase().includes(s)
                        );
                      }).map(w => [w.govt_id, w.name, w.role, w.date, w.location]);
                      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `Manpower_${modalType}_Names_${new Date().toISOString().slice(0,10)}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      height: "36px"
                    }}
                  >
                    <FiUpload size={13} style={{ transform: "rotate(180deg)" }} /> Export Names
                  </button>
                </div>
              </div>

              {/* Modal Body / Table (View-Only) */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 24px"
              }}>
                {modalLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "40px 10px", color: "var(--text-secondary)", gap: "8px", alignItems: "center" }}>
                    <div className="spinner" style={{ width: "16px", height: "16px", border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                    Loading personnel details...
                  </div>
                ) : (
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>#</th>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>AADHAR NUMBER</th>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>NAME</th>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>DESIGNATION</th>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>ALLOCATION DATE</th>
                        <th style={{ padding: "8px 12px", fontSize: "11px" }}>LOCATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalWorkers.filter(w => {
                        const s = modalSearch.toLowerCase();
                        return (
                          (w.govt_id || "").toLowerCase().includes(s) ||
                          (w.name || "").toLowerCase().includes(s) ||
                          (w.location || "").toLowerCase().includes(s) ||
                          (w.date || "").toLowerCase().includes(s)
                        );
                      }).length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                            No workers matched your search.
                          </td>
                        </tr>
                      ) : (
                        modalWorkers.filter(w => {
                          const s = modalSearch.toLowerCase();
                          return (
                            (w.govt_id || "").toLowerCase().includes(s) ||
                            (w.name || "").toLowerCase().includes(s) ||
                            (w.location || "").toLowerCase().includes(s) ||
                            (w.date || "").toLowerCase().includes(s)
                          );
                        }).map((w, idx) => (
                          <tr key={w.id}>
                            <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "12px" }}>{idx + 1}</td>
                            <td style={{ padding: "10px 12px", fontWeight: "600", fontSize: "12px" }}>
                              <span style={{ fontFamily: "monospace", letterSpacing: "0.2px" }}>{w.govt_id || "—"}</span>
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: "500", color: "var(--text-primary)", fontSize: "12px" }}>
                              {w.name || "—"}
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: "12px" }}>
                              <span className={`badge badge-${modalType === "permanent" ? "green" : modalType === "additional" ? "orange" : "blue"}`} style={{ padding: "2px 6px", fontSize: "10px" }}>
                                {w.role === "permanent" ? "Permanent Worker" : w.role === "additional" ? "Additional Worker" : "Supervisor"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 12px", fontSize: "12px" }}>{w.date}</td>
                            <td style={{ padding: "10px 12px", fontWeight: "500", fontSize: "12px" }}>{w.location}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-base)"
              }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Total Count: {modalWorkers.filter(w => {
                    const s = modalSearch.toLowerCase();
                    return (
                      (w.govt_id || "").toLowerCase().includes(s) ||
                      (w.name || "").toLowerCase().includes(s) ||
                      (w.location || "").toLowerCase().includes(s) ||
                      (w.date || "").toLowerCase().includes(s)
                    );
                  }).length} personnel
                </span>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setModalType(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ManPower;
