import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { FiUpload, FiSearch, FiEdit2, FiTrash2, FiCheck, FiX, FiPlus, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const statusColors = {
  "Kitting":           "badge-blue",
  "Inspection Passed": "badge-green",
  "Inspection Failed": "badge-red",
  "Dispatched":        "badge-purple",
};

function Upload() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [search, setSearch] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRowData, setNewRowData] = useState({});

  const [editId, setEditId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [editStatus, setEditStatus] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Pagination & Selection states
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = 50;

  const fetchData = async (page = currentPage, searchQuery = search) => {
    try {
      const response = await api.get(`/upload-data?page=${page}&page_size=${pageSize}&search=${searchQuery}`);
      setData(response.data.rows || []);
      setColumns(response.data.columns || []);
      setTotalRows(response.data.total_rows || 0);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchData(currentPage, search);
  }, [currentPage, search]);

  const [uploading, setUploading] = useState(false);

  const uploadFile = async () => {
    if (!file) { setUploadMsg("Please select a file first."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/upload", formData);
      setUploadMsg("✅ Uploaded successfully!");
      setFile(null);
      setCurrentPage(1);
      fetchData(1, search);
    } catch (error) {
      const errMsg = error.response?.data?.detail || "Upload failed. Check file format.";
      setUploadMsg(`❌ ${errMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const createManualRow = async () => {
    try {
      await api.post("/upload-data", {
        row_data: newRowData,
        status: "Kitting"
      });
      setNewRowData({});
      setShowAddForm(false);
      fetchData(currentPage, search);
    } catch (error) {
      console.log(error);
    }
  };

  const updateData = async () => {
    try {
      await api.put(`/upload-data/${editId}`, {
        row_data: editRowData,
        status: editStatus
      });
      setEditId(null);
      fetchData(currentPage, search);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteData = async (id) => {
    try {
      await api.delete(`/upload-data/${id}`);
      setDeleteConfirmId(null);
      setSelectedIds(selectedIds.filter(x => x !== id));
      fetchData(currentPage, search);
    } catch (error) {
      console.log(error);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) return;
    try {
      await api.post("/upload-data/delete-bulk", { ids: selectedIds });
      setSelectedIds([]);
      setCurrentPage(1);
      fetchData(1, search);
    } catch {
      alert("Failed to delete selected upload entries.");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/upload-status/${id}?status=${status}`);
      fetchData(currentPage, search);
    } catch (error) {
      console.log(error);
    }
  };

  // Helper to format key names to human readable titles
  const formatHeader = (header) => {
    return header.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  // Master Checkbox Logic
  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(item => item.id));
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
  const totalPages = Math.ceil(totalRows / pageSize) || 1;
  const paginated = data;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Uploaded Records Export", 20, 20);
    doc.setFontSize(9);

    // Draw header row
    const headers = ["#", ...columns];
    const headerStr = headers.map(h => formatHeader(h)).join(" | ");
    doc.text(headerStr, 20, 32);
    doc.line(20, 35, 190, 35);

    let yPos = 42;
    data.forEach((item, idx) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      const rowVals = [
        String(idx + 1),
        ...columns.map(col => String(item.row_data[col] !== null && item.row_data[col] !== undefined ? item.row_data[col] : "—"))
      ];
      const rowStr = rowVals.join(" | ");
      doc.text(rowStr, 20, yPos);
      yPos += 8;
    });

    doc.save("uploaded_records.pdf");
  };

  const exportExcel = () => {
    const exportData = data.map((item, idx) => {
      const obj = { "#": idx + 1 };
      columns.forEach(col => {
        obj[formatHeader(col)] = item.row_data[col] !== null && item.row_data[col] !== undefined ? item.row_data[col] : "—";
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "uploaded_records.xlsx");
  };

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Upload Management</h1>
            <p className="page-subtitle">Import kits from Excel and manage records</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
              <FiDownload size={13} /> PDF
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
              <FiDownload size={13} /> Excel
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => { setShowAddForm(!showAddForm); setEditId(null); }}
            >
              <FiPlus size={14} /> {showAddForm ? "Cancel" : "Add Row Manually"}
            </button>
          </div>
        </div>

        {/* Import Excel Section */}
        <div className="card">
          <div className="card-title">Import Excel File</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "9px 16px", background: "var(--bg-elevated)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px",
              transition: "all 0.15s"
            }}>
              <FiUpload size={14} />
              {file ? file.name : "Choose Excel file (.xlsx)"}
              <input
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => { setFile(e.target.files[0]); setUploadMsg(""); }}
              />
            </label>

            <button className="btn btn-primary" onClick={uploadFile} disabled={uploading}>
              <FiUpload size={13} /> {uploading ? "Uploading Excel..." : "Upload"}
            </button>

            {uploadMsg && (
              <span style={{
                fontSize: "13px",
                fontWeight: "500",
                color: uploadMsg.startsWith("✅") ? "var(--success)" : "var(--danger)"
              }}>
                {uploadMsg}
              </span>
            )}
          </div>

          {uploading && (
            <div className="alert" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "var(--accent)", marginTop: "14px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
              <span>⏳ Processing and uploading Excel sheet records... Please wait, do not close the window.</span>
            </div>
          )}

          <p style={{ marginTop: "10px", color: "var(--text-muted)", fontSize: "12px" }}>
            Upload any Excel spreadsheet. Rows and columns will adapt dynamically.
          </p>
        </div>

        {/* Manual Add Form */}
        {showAddForm && (
          <div className="card">
            <div className="card-title">Add Row Manually</div>
            <div className="form-grid">
              {columns.map((col) => (
                <div className="form-group" key={col}>
                  <label className="form-label">{formatHeader(col)}</label>
                  <input
                    className="form-input"
                    placeholder={`Enter ${col.replace(/_/g, " ")}`}
                    value={newRowData[col] || ""}
                    onChange={(e) => setNewRowData({ ...newRowData, [col]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: "12px" }}>
              <button className="btn btn-success btn-sm" onClick={createManualRow}>
                <FiCheck size={13} /> Save Record
              </button>
            </div>
          </div>
        )}

        {/* Edit Form */}
        {editId && (
          <div className="card">
            <div className="card-title">Edit Record — ID #{editId}</div>
            <div className="form-grid">
              {columns.map((col) => (
                <div className="form-group" key={col}>
                  <label className="form-label">{formatHeader(col)}</label>
                  <input
                    className="form-input"
                    value={editRowData[col] || ""}
                    onChange={(e) => setEditRowData({ ...editRowData, [col]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn btn-primary btn-sm" onClick={updateData}>
                <FiCheck size={13} /> Save Changes
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>
                <FiX size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Data Table */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              Records ({totalRows})
            </span>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {selectedIds.length > 0 && (
                <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                  <FiTrash2 size={13} /> Delete Selected ({selectedIds.length})
                </button>
              )}
              <div className="search-bar">
                <FiSearch size={14} />
                <input
                  placeholder="Search keywords..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
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
                  {columns.map((col) => (
                    <th key={col}>{col.replace(/_/g, " ").toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2}>
                      <div className="empty-state">No records found.</div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((item, index) => (
                    <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? "var(--bg-elevated)" : "transparent" }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{((currentPage - 1) * pageSize) + index + 1}</td>
                      {columns.map((col) => (
                        <td key={col}>
                          {item.row_data && (item.row_data[col] !== null && item.row_data[col] !== undefined)
                            ? String(item.row_data[col])
                            : "—"}
                        </td>
                      ))}
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
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRows)} of {totalRows} entries
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

export default Upload;