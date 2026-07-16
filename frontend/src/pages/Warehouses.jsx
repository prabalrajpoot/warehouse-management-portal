import { useState, useEffect } from "react";
import Loader from "../components/Loader";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiSearch, FiFilter, FiMapPin, FiLayers, FiEye } from "react-icons/fi";
import { isReadOnly } from "../utils/auth";

const TRADE_OPTIONS = [
  "Armourer",
  "Metal Smith/ Metal Caster",
  "Sculptor(Moortikar)/Stone Carver/Stone Breaker",
  "Hammer and ToolKit Maker",
  "Fishing Net Maker",
  "Boat Maker",
  "Barber(Naai)"
];

function Warehouses() {
  const [activeTab, setActiveTab] = useState("warehouses"); // "warehouses" or "mappings"
  const [warehouses, setWarehouses] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // Warehouse Form States
  const [showWhForm, setShowWhForm] = useState(false);
  const [whName, setWhName] = useState("");
  const [whGst, setWhGst] = useState("");
  const [whState, setWhState] = useState("");
  const [whDistrict, setWhDistrict] = useState("");
  const [whPincode, setWhPincode] = useState("");
  const [whAddr1, setWhAddr1] = useState("");
  const [whAddr2, setWhAddr2] = useState("");
  const [whContactName, setWhContactName] = useState("");
  const [whContactNo, setWhContactNo] = useState("");
  const [whEmail, setWhEmail] = useState("");
  const [whZone, setWhZone] = useState("North Zone");

  // Warehouse Edit States
  const [editWhId, setEditWhId] = useState(null);
  const [editWhName, setEditWhName] = useState("");
  const [editWhGst, setEditWhGst] = useState("");
  const [editWhState, setEditWhState] = useState("");
  const [editWhDistrict, setEditWhDistrict] = useState("");
  const [editWhPincode, setEditWhPincode] = useState("");
  const [editWhAddr1, setEditWhAddr1] = useState("");
  const [editWhAddr2, setEditWhAddr2] = useState("");
  const [editWhContactName, setEditWhContactName] = useState("");
  const [editWhContactNo, setEditWhContactNo] = useState("");
  const [editWhEmail, setEditWhEmail] = useState("");
  const [editWhZone, setEditWhZone] = useState("");

  const [deleteConfirmWhId, setDeleteConfirmWhId] = useState(null);

  // Mapping Form States
  const [showMapForm, setShowMapForm] = useState(false);
  const [mapZone, setMapZone] = useState("North Zone");
  const [mapState, setMapState] = useState("");
  const [mapDistrict, setMapDistrict] = useState("");
  const [mapTrade, setMapTrade] = useState("Barbers (Naai)");
  const [mapType, setMapType] = useState("SET A");
  const [mapWarehouse, setMapWarehouse] = useState("");

  // Mapping Edit States
  const [editMapId, setEditMapId] = useState(null);
  const [editMapZone, setEditMapZone] = useState("");
  const [editMapState, setEditMapState] = useState("");
  const [editMapDistrict, setEditMapDistrict] = useState("");
  const [editMapTrade, setEditMapTrade] = useState("");
  const [editMapType, setEditMapType] = useState("");
  const [editMapWarehouse, setEditMapWarehouse] = useState("");

  const [deleteConfirmMapId, setDeleteConfirmMapId] = useState(null);

  // Mapping Filters
  const [filterZone, setFilterZone] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "Mapped" or "Unmapped"

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([fetchWarehouses(), fetchMappings()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const r = await api.get("/warehouses");
      setWarehouses(r.data);
    } catch (e) {
      console.log(e);
    }
  };

  const fetchMappings = async () => {
    try {
      const r = await api.get("/warehouses/district-mappings");
      setMappings(r.data);
    } catch (e) {
      console.log(e);
    }
  };

  // Create Warehouse
  const createWarehouse = async () => {
    if (!whName || !whState || !whDistrict) {
      setMsg("Warehouse Name, State and District are required.");
      return;
    }
    try {
      await api.post("/warehouses", {
        name: whName,
        vendor_name: "Pragyawan Technologies Private Limited",
        gst_no: whGst || null,
        state: whState.toUpperCase(),
        district: whDistrict,
        pincode: whPincode || null,
        address_line_1: whAddr1 || null,
        address_line_2: whAddr2 || null,
        contact_name: whContactName || null,
        contact_no: whContactNo || null,
        email_id: whEmail || null,
        zone: whZone
      });
      // Reset
      setWhName(""); setWhGst(""); setWhState(""); setWhDistrict(""); setWhPincode("");
      setWhAddr1(""); setWhAddr2(""); setWhContactName(""); setWhContactNo(""); setWhEmail("");
      setShowWhForm(false); setMsg("");
      fetchWarehouses();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Failed to create warehouse.");
    }
  };

  // Update Warehouse
  const updateWarehouse = async () => {
    if (!editWhName || !editWhState || !editWhDistrict) {
      alert("Warehouse Name, State and District are required.");
      return;
    }
    try {
      await api.put(`/warehouses/${editWhId}`, {
        name: editWhName,
        vendor_name: "Pragyawan Technologies Private Limited",
        gst_no: editWhGst || null,
        state: editWhState.toUpperCase(),
        district: editWhDistrict,
        pincode: editWhPincode || null,
        address_line_1: editWhAddr1 || null,
        address_line_2: editWhAddr2 || null,
        contact_name: editWhContactName || null,
        contact_no: editWhContactNo || null,
        email_id: editWhEmail || null,
        zone: editWhZone
      });
      const updatedId = editWhId;
      setEditWhId(null);
      fetchWarehouses();
      setTimeout(() => {
        const row = document.getElementById(`wh-row-${updatedId}`);
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => {
            row.style.backgroundColor = "";
          }, 1500);
        }
      }, 200);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update warehouse.");
    }
  };

  // Delete Warehouse
  const deleteWarehouse = async (id) => {
    try {
      await api.delete(`/warehouses/${id}`);
      setDeleteConfirmWhId(null);
      fetchWarehouses();
    } catch {
      alert("Failed to delete warehouse.");
    }
  };

  // Create Mapping
  const createMapping = async () => {
    if (!mapState || !mapDistrict || !mapWarehouse) {
      setMsg("State, District and Mapped Warehouse are required.");
      return;
    }
    try {
      await api.post("/warehouses/district-mappings", {
        zone: mapZone,
        state: mapState.toUpperCase(),
        district: mapDistrict.toUpperCase(),
        trade: mapTrade,
        type: mapType,
        mapped_warehouse: mapWarehouse
      });
      setMapState(""); setMapDistrict("");
      setShowMapForm(false); setMsg("");
      fetchMappings();
    } catch {
      setMsg("Failed to create district mapping.");
    }
  };

  // Update Mapping
  const updateMapping = async () => {
    if (!editMapState || !editMapDistrict || !editMapWarehouse) {
      alert("State, District and Mapped Warehouse are required.");
      return;
    }
    try {
      await api.put(`/warehouses/district-mappings/${editMapId}`, {
        zone: editMapZone,
        state: editMapState.toUpperCase(),
        district: editMapDistrict.toUpperCase(),
        trade: editMapTrade,
        type: editMapType,
        mapped_warehouse: editMapWarehouse
      });
      const updatedId = editMapId;
      setEditMapId(null);
      fetchMappings();
      setTimeout(() => {
        const row = document.getElementById(`map-row-${updatedId}`);
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
      alert("Failed to update mapping.");
    }
  };

  // Delete Mapping
  const deleteMapping = async (id) => {
    try {
      await api.delete(`/warehouses/district-mappings/${id}`);
      setDeleteConfirmMapId(null);
      fetchMappings();
    } catch {
      alert("Failed to delete mapping.");
    }
  };

  // Start edit Wh
  const startEditWh = (wh) => {
    setEditWhId(wh.id);
    setEditWhName(wh.name);
    setEditWhGst(wh.gst_no || "");
    setEditWhState(wh.state || "");
    setEditWhDistrict(wh.district || "");
    setEditWhPincode(wh.pincode || "");
    setEditWhAddr1(wh.address_line_1 || "");
    setEditWhAddr2(wh.address_line_2 || "");
    setEditWhContactName(wh.contact_name || "");
    setEditWhContactNo(wh.contact_no || "");
    setEditWhEmail(wh.email_id || "");
    setEditWhZone(wh.zone || "North Zone");
    setShowWhForm(false);
    setDeleteConfirmWhId(null);
    setTimeout(() => {
      const container = document.getElementById("wh-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Start edit Map
  const startEditMap = (m) => {
    setEditMapId(m.id);
    setEditMapZone(m.zone || "North Zone");
    setEditMapState(m.state || "");
    setEditMapDistrict(m.district || "");
    setEditMapTrade(m.trade || "Barbers (Naai)");
    setEditMapType(m.type || "SET A");
    setEditMapWarehouse(m.mapped_warehouse || "");
    setShowMapForm(false);
    setDeleteConfirmMapId(null);
    setTimeout(() => {
      const container = document.getElementById("map-edit-form-container");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Filtering for District Mappings
  const filteredMappings = mappings.filter((m) => {
    if (filterZone && m.zone !== filterZone) return false;
    if (filterState && m.state !== filterState) return false;
    if (filterType && m.type !== filterType) return false;
    if (filterWarehouse && m.mapped_warehouse !== filterWarehouse) return false;
    if (filterStatus) {
      const isMapped = !!m.mapped_warehouse;
      if (filterStatus === "Mapped" && !isMapped) return false;
      if (filterStatus === "Unmapped" && isMapped) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.district.toLowerCase().includes(q) ||
        (m.mapped_warehouse || "").toLowerCase().includes(q) ||
        m.state.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Extract unique options for dropdown filters
  const uniqueStates = [...new Set(mappings.map((m) => m.state).filter(Boolean))].sort();
  const uniqueZones = [...new Set(mappings.map((m) => m.zone).filter(Boolean))].sort();

  // Tab Styles
  const tabStyle = (tab) => ({
    padding: "10px 24px",
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
            <h1 className="page-title">Warehouse Management</h1>
            <p className="page-subtitle">Configure warehouses list and link districts mappings</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", background: "var(--bg-surface)", padding: "6px", borderRadius: "8px", border: "1px solid var(--border)", width: "fit-content" }}>
          <button style={tabStyle("warehouses")} onClick={() => { setActiveTab("warehouses"); setMsg(""); }}>
            🏢 Warehouses
          </button>
          <button style={tabStyle("mappings")} onClick={() => { setActiveTab("mappings"); setMsg(""); }}>
            🗺️ Warehouse District Mapping
          </button>
        </div>

        {loading ? (
          <Loader message="Loading warehouses data..." />
        ) : (
          <>
            {/* TAB 1: WAREHOUSES LIST */}
            {activeTab === "warehouses" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              {!isReadOnly() && !showWhForm && !editWhId && (
                <button className="btn btn-primary btn-sm" onClick={() => { setShowWhForm(true); setMsg(""); }}>
                  <FiPlus size={14} /> Add Warehouse
                </button>
              )}
            </div>

            {/* Create Warehouse Form */}
            {showWhForm && !isReadOnly() && (
              <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "6px" }}>
                    🏢 Add Warehouse
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowWhForm(false)}>
                    <FiX size={14} /> Back
                  </button>
                </div>

                <div className="form-section-title" style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px", background: "var(--bg-muted)", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                  📋 BASIC INFORMATION
                </div>
                <div className="form-grid" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">VENDOR NAME</label>
                    <input className="form-input" value="Pragyawan Technologies Private Limited" disabled style={{ background: "var(--bg-muted)" }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WAREHOUSE NAME</label>
                    <input className="form-input" placeholder="e.g. Bangalore Warehouse" value={whName} onChange={(e) => setWhName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST NO.</label>
                    <input className="form-input" placeholder="e.g. 29AAAAA1111A1Z1" value={whGst} onChange={(e) => setWhGst(e.target.value)} />
                  </div>
                </div>

                <div className="form-section-title" style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px", background: "var(--bg-muted)", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                  📍 LOCATION
                </div>
                <div className="form-grid" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">STATE NAME</label>
                    <select className="form-select" value={whState} onChange={(e) => setWhState(e.target.value)}>
                      <option value="">--Select State--</option>
                      <option value="KARNATAKA">KARNATAKA</option>
                      <option value="TAMIL NADU">TAMIL NADU</option>
                      <option value="ASSAM">ASSAM</option>
                      <option value="GUJARAT">GUJARAT</option>
                      <option value="RAJASTHAN">RAJASTHAN</option>
                      <option value="ODISHA">ODISHA</option>
                      <option value="UTTAR PRADESH">UTTAR PRADESH</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">DISTRICT NAME</label>
                    <input className="form-input" placeholder="e.g. BENGALURU URBAN" value={whDistrict} onChange={(e) => setWhDistrict(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PINCODE</label>
                    <input className="form-input" placeholder="560001" value={whPincode} onChange={(e) => setWhPincode(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZONE</label>
                    <select className="form-select" value={whZone} onChange={(e) => setWhZone(e.target.value)}>
                      <option value="North Zone">North Zone</option>
                      <option value="South Zone">South Zone</option>
                      <option value="East Zone">East Zone</option>
                      <option value="West Zone">West Zone</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label className="form-label">ADDRESS LINE 1</label>
                    <input className="form-input" placeholder="Address line 1" value={whAddr1} onChange={(e) => setWhAddr1(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label className="form-label">ADDRESS LINE 2</label>
                    <input className="form-input" placeholder="Address line 2" value={whAddr2} onChange={(e) => setWhAddr2(e.target.value)} />
                  </div>
                </div>

                <div className="form-section-title" style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px", background: "var(--bg-muted)", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px" }}>
                  📞 CONTACT DETAILS
                </div>
                <div className="form-grid" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">WAREHOUSE CONTACT NAME</label>
                    <input className="form-input" placeholder="Name" value={whContactName} onChange={(e) => setWhContactName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WAREHOUSE CONTACT NO.</label>
                    <input className="form-input" placeholder="Contact number" value={whContactNo} onChange={(e) => setWhContactNo(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WAREHOUSE EMAIL ID</label>
                    <input className="form-input" placeholder="Email ID" value={whEmail} onChange={(e) => setWhEmail(e.target.value)} />
                  </div>
                </div>

                {msg && <div className="alert alert-error">{msg}</div>}
                <button className="btn btn-primary" style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={createWarehouse}>
                  💾 Save Warehouse
                </button>
              </div>
            )}

            {/* Edit Warehouse Form */}
            {editWhId && !isReadOnly() && (
              <div id="wh-edit-form-container" className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                    ✏️ Edit Warehouse Mappings
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const prevId = editWhId;
                    setEditWhId(null);
                    setTimeout(() => {
                      const row = document.getElementById(`wh-row-${prevId}`);
                      if (row) {
                        row.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }, 100);
                  }}>
                    <FiX size={14} /> Cancel
                  </button>
                </div>

                <div className="form-grid" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">WAREHOUSE NAME</label>
                    <input className="form-input" value={editWhName} onChange={(e) => setEditWhName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST NO.</label>
                    <input className="form-input" value={editWhGst} onChange={(e) => setEditWhGst(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">STATE NAME</label>
                    <input className="form-input" value={editWhState} onChange={(e) => setEditWhState(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DISTRICT NAME</label>
                    <input className="form-input" value={editWhDistrict} onChange={(e) => setEditWhDistrict(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PINCODE</label>
                    <input className="form-input" value={editWhPincode} onChange={(e) => setEditWhPincode(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZONE</label>
                    <select className="form-select" value={editWhZone} onChange={(e) => setEditWhZone(e.target.value)}>
                      <option value="North Zone">North Zone</option>
                      <option value="South Zone">South Zone</option>
                      <option value="East Zone">East Zone</option>
                      <option value="West Zone">West Zone</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label className="form-label">ADDRESS LINE 1</label>
                    <input className="form-input" value={editWhAddr1} onChange={(e) => setEditWhAddr1(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ gridColumn: "span 2" }}>
                    <label className="form-label">ADDRESS LINE 2</label>
                    <input className="form-input" value={editWhAddr2} onChange={(e) => setEditWhAddr2(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CONTACT NAME</label>
                    <input className="form-input" value={editWhContactName} onChange={(e) => setEditWhContactName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CONTACT NO.</label>
                    <input className="form-input" value={editWhContactNo} onChange={(e) => setEditWhContactNo(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">EMAIL ID</label>
                    <input className="form-input" value={editWhEmail} onChange={(e) => setEditWhEmail(e.target.value)} />
                  </div>
                </div>

                <button className="btn btn-primary" onClick={updateWarehouse}>
                  <FiCheck size={13} /> Update Warehouse Mappings
                </button>
              </div>
            )}

            {/* List */}
            <div className="card">
              <div className="card-title">Warehouses ({warehouses.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>WAREHOUSE NAME</th>
                      <th>STATE</th>
                      <th>DISTRICT</th>
                      <th>ZONE</th>
                      <th>CONTACT NO</th>
                      {!isReadOnly() && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.length === 0 ? (
                      <tr><td colSpan={7}><div className="empty-state">No warehouses configured yet.</div></td></tr>
                    ) : (
                      warehouses.map((wh, idx) => (
                        <tr id={`wh-row-${wh.id}`} key={wh.id}>
                          <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{wh.name}</td>
                          <td>{wh.state || "—"}</td>
                          <td>{wh.district || "—"}</td>
                          <td><span className="badge badge-purple">{wh.zone || "—"}</span></td>
                          <td>{wh.contact_no || "—"}</td>
                          {!isReadOnly() && (
                            <td>
                              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <button
                                  style={{
                                    border: "none", background: "none", cursor: "pointer", color: "#eab308", display: "flex", alignItems: "center"
                                  }}
                                  title="Edit"
                                  onClick={() => startEditWh(wh)}
                                >
                                  <FiEdit2 size={15} />
                                </button>
                                {deleteConfirmWhId === wh.id ? (
                                  <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                    Sure?
                                    <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteWarehouse(wh.id)}>
                                      <FiCheck size={13} />
                                    </button>
                                    <button className="btn-icon" onClick={() => setDeleteConfirmWhId(null)}>
                                      <FiX size={13} />
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    style={{
                                      border: "none", background: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center"
                                    }}
                                    title="Delete"
                                    onClick={() => setDeleteConfirmWhId(wh.id)}
                                  >
                                    <FiTrash2 size={15} />
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
            </div>
          </>
        )}

        {/* TAB 2: DISTRICT MAPPINGS VIEW */}
        {activeTab === "mappings" && (
          <>
            {/* Filters Section */}
            <div className="card" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                  🗺️ Mapping Filters & Actions
                </span>
                {!isReadOnly() && !showMapForm && !editMapId && (
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowMapForm(true); setMsg(""); }}>
                    <FiPlus size={14} /> Add Mapping
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", alignItems: "end" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>ZONE NAME</label>
                  <select className="form-select" value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
                    <option value="">--Select Zone--</option>
                    {uniqueZones.map((z) => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>STATE NAME</label>
                  <select className="form-select" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
                    <option value="">--Select State--</option>
                    {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>TOOLKIT TYPE</label>
                  <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">--Select Toolkit--</option>
                    <option value="SET A">SET A</option>
                    <option value="SET B">SET B</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>WAREHOUSE MAPPED</label>
                  <select className="form-select" value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
                    <option value="">--Select Warehouse--</option>
                    {warehouses.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "11px" }}>MAPPED STATUS</label>
                  <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">--Select Status--</option>
                    <option value="Mapped">Mapped</option>
                    <option value="Unmapped">Unmapped</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "space-between", alignItems: "center" }}>
                <div className="search-bar" style={{ width: "300px" }}>
                  <FiSearch size={14} />
                  <input placeholder="Search district or warehouse..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setFilterZone(""); setFilterState(""); setFilterType(""); setFilterWarehouse(""); setFilterStatus(""); setSearchQuery("");
                }}>
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Create Mapping Form */}
            {showMapForm && !isReadOnly() && (
              <div className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                    🗺️ New District Mapping
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowMapForm(false)}>
                    <FiX size={14} /> Cancel
                  </button>
                </div>

                <div className="form-grid" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">ZONE</label>
                    <select className="form-select" value={mapZone} onChange={(e) => setMapZone(e.target.value)}>
                      <option value="North Zone">North Zone</option>
                      <option value="South Zone">South Zone</option>
                      <option value="East Zone">East Zone</option>
                      <option value="West Zone">West Zone</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">STATE NAME</label>
                    <input className="form-input" placeholder="e.g. KARNATAKA" value={mapState} onChange={(e) => setMapState(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DISTRICT</label>
                    <input className="form-input" placeholder="e.g. BENGALURU URBAN" value={mapDistrict} onChange={(e) => setMapDistrict(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TRADE NAME</label>
                    <select className="form-select" value={mapTrade} onChange={(e) => setMapTrade(e.target.value)}>
                      <option value="">--Select Trade--</option>
                      {TRADE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">TYPE</label>
                    <select className="form-select" value={mapType} onChange={(e) => setMapType(e.target.value)}>
                      <option value="SET A">SET A</option>
                      <option value="SET B">SET B</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">MAPPED WAREHOUSE</label>
                    <select className="form-select" value={mapWarehouse} onChange={(e) => setMapWarehouse(e.target.value)}>
                      <option value="">--Select Warehouse--</option>
                      {warehouses.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                    </select>
                  </div>
                </div>

                {msg && <div className="alert alert-error">{msg}</div>}
                <button className="btn btn-primary" onClick={createMapping}>
                  💾 Save Mapping
                </button>
              </div>
            )}

            {/* Edit Mapping Form */}
            {editMapId && !isReadOnly() && (
              <div id="map-edit-form-container" className="card" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                  <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent)" }}>
                    ✏️ Edit District Mapping — ID #{editMapId}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const prevId = editMapId;
                    setEditMapId(null);
                    setTimeout(() => {
                      const row = document.getElementById(`map-row-${prevId}`);
                      if (row) {
                        row.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }, 100);
                  }}>
                    <FiX size={14} /> Cancel
                  </button>
                </div>

                <div className="form-grid" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">ZONE</label>
                    <select className="form-select" value={editMapZone} onChange={(e) => setEditMapZone(e.target.value)}>
                      <option value="North Zone">North Zone</option>
                      <option value="South Zone">South Zone</option>
                      <option value="East Zone">East Zone</option>
                      <option value="West Zone">West Zone</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">STATE NAME</label>
                    <input className="form-input" value={editMapState} onChange={(e) => setEditMapState(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">DISTRICT</label>
                    <input className="form-input" value={editMapDistrict} onChange={(e) => setEditMapDistrict(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TRADE NAME</label>
                    <select className="form-select" value={editMapTrade} onChange={(e) => setEditMapTrade(e.target.value)}>
                      <option value="">--Select Trade--</option>
                      {TRADE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">TYPE</label>
                    <select className="form-select" value={editMapType} onChange={(e) => setEditMapType(e.target.value)}>
                      <option value="SET A">SET A</option>
                      <option value="SET B">SET B</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">MAPPED WAREHOUSE</label>
                    <select className="form-select" value={editMapWarehouse} onChange={(e) => setEditMapWarehouse(e.target.value)}>
                      <option value="">--Select Warehouse--</option>
                      {warehouses.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={updateMapping}>
                  <FiCheck size={13} /> Update Mapping
                </button>
              </div>
            )}

            {/* Table */}
            <div className="card">
              <div className="card-title">Warehouse District Mappings ({filteredMappings.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {!isReadOnly() && <th style={{ width: "40px" }}><input type="checkbox" style={{ cursor: "pointer" }} /></th>}
                      <th>ZONE</th>
                      <th>STATE</th>
                      <th>DISTRICT</th>
                      <th>TRADE</th>
                      <th>TYPE</th>
                      <th>MAPPED WAREHOUSE</th>
                      {!isReadOnly() && <th>ACTION</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.length === 0 ? (
                      <tr><td colSpan={8}><div className="empty-state">No district mappings match the selected filters.</div></td></tr>
                    ) : (
                      filteredMappings.map((m) => (
                        <tr id={`map-row-${m.id}`} key={m.id}>
                          {!isReadOnly() && <td><input type="checkbox" style={{ cursor: "pointer" }} /></td>}
                          <td><span className="badge badge-purple">{m.zone || "—"}</span></td>
                          <td>{m.state}</td>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.district}</td>
                          <td><span className="badge badge-blue">{m.trade}</span></td>
                          <td><span className="badge badge-orange">{m.type}</span></td>
                          <td>
                            {m.mapped_warehouse ? (
                              <span className="badge badge-green" style={{ fontWeight: 600 }}>{m.mapped_warehouse}</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>— Unmapped —</span>
                            )}
                          </td>
                          {!isReadOnly() && (
                            <td>
                              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <button
                                  style={{
                                    border: "none", background: "none", cursor: "pointer", color: "#eab308", display: "flex", alignItems: "center"
                                  }}
                                  title="Edit Mapping"
                                  onClick={() => startEditMap(m)}
                                >
                                  <FiEdit2 size={15} />
                                </button>
                                {deleteConfirmMapId === m.id ? (
                                  <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                    Sure?
                                    <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => deleteMapping(m.id)}>
                                      <FiCheck size={13} />
                                    </button>
                                    <button className="btn-icon" onClick={() => setDeleteConfirmMapId(null)}>
                                      <FiX size={13} />
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    style={{
                                      border: "none", background: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center"
                                    }}
                                    title="Delete Mapping"
                                    onClick={() => setDeleteConfirmMapId(m.id)}
                                  >
                                    <FiTrash2 size={15} />
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
            </div>
          </>
        )}
          </>
        )}

      </div>
    </div>
  );
}

export default Warehouses;
