import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import {
  FiUserPlus, FiEdit2, FiTrash2,
  FiCheck, FiX, FiShield, FiUser, FiSearch, FiEye
} from "react-icons/fi";
import { getRole, isReadOnly } from "../utils/auth";

const ROLE_OPTIONS = [
  { value: "superadmin", label: "Super Admin", color: "#f59e0b" },
  { value: "admin", label: "Admin", color: "#8b5cf6" },
  { value: "warehouse_manager", label: "Warehouse Manager", color: "#3b82f6" },
  { value: "worker", label: "Worker", color: "#10b981" }
];

const ROLE_BADGE_CLASS = {
  superadmin: "badge-orange",
  admin: "badge-purple",
  warehouse_manager: "badge-blue",
  worker: "badge-green"
};

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [warehouses, setWarehouses] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("worker");
  const [newWarehouse, setNewWarehouse] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState("");
  const [editWarehouseValue, setEditWarehouseValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const readOnly = isReadOnly();
  const currentRole = getRole();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      setUsers(response.data);
      setError("");
    } catch {
      setError("Failed to load users. Make sure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const r = await api.get("/warehouses");
      setWarehouses(r.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
  }, []);

  const handleAddUser = async () => {
    if (!newName || !newEmail || !newPassword) {
      setAddError("All fields are required.");
      return;
    }
    if (newRole === "warehouse_manager" && !newWarehouse) {
      setAddError("Please select a warehouse for this Warehouse Manager.");
      return;
    }
    try {
      setAddLoading(true);
      setAddError("");
      await api.post("/users", {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        warehouse_name: newRole === "warehouse_manager" ? newWarehouse : null
      });
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("worker"); setNewWarehouse("");
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setAddError(err.response?.data?.detail || "Failed to add user.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleChangeRole = async (userId) => {
    if (editRoleValue === "warehouse_manager" && !editWarehouseValue) {
      alert("Please select a warehouse for this Warehouse Manager.");
      return;
    }
    try {
      await api.patch(`/users/${userId}/role`, {
        role: editRoleValue,
        warehouse_name: editRoleValue === "warehouse_manager" ? editWarehouseValue : null
      });
      setEditRoleId(null);
      fetchUsers();
      setTimeout(() => {
        const row = document.getElementById(`user-row-${userId}`);
        if (row) {
          row.style.transition = "background-color 0.5s ease";
          row.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
          setTimeout(() => { row.style.backgroundColor = ""; }, 1500);
        }
      }, 200);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update role.");
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      setDeleteConfirmId(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete user.");
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">
              {readOnly ? "View-only — contact an Admin to make changes" : "Manage portal users and their roles"}
            </p>
          </div>
          {!readOnly && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setShowForm(!showForm); setAddError(""); }}
            >
              <FiUserPlus size={14} /> {showForm ? "Cancel" : "Add User"}
            </button>
          )}
        </div>

        {/* Read-only banner for superadmin */}
        {readOnly && (
          <div className="alert" style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#f59e0b",
            marginBottom: "16px"
          }}>
            <FiEye size={14} style={{ flexShrink: 0 }} />
            You are viewing as <strong>Super Admin</strong> — read-only mode. No changes can be made.
          </div>
        )}

        {/* Error banner */}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Add User Form */}
        {showForm && !readOnly && (
          <div className="card">
            <div className="card-title">New User</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="john@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={newRole} onChange={(e) => { setNewRole(e.target.value); setNewWarehouse(""); }}>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {newRole === "warehouse_manager" && (
                <div className="form-group">
                  <label className="form-label">Assign Warehouse</label>
                  <select className="form-select" value={newWarehouse} onChange={(e) => setNewWarehouse(e.target.value)}>
                    <option value="">— Select Warehouse —</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {addError && <div className="alert alert-error" style={{ marginTop: "4px" }}>{addError}</div>}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddUser}
              disabled={addLoading}
            >
              <FiCheck size={13} /> {addLoading ? "Saving..." : "Save User"}
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px" }}>
              All Users ({filtered.length})
            </span>
            <div className="search-bar">
              <FiSearch size={14} />
              <input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading users...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Warehouse</th>
                    {!readOnly && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={readOnly ? 5 : 6}><div className="empty-state">No users found.</div></td></tr>
                  ) : (
                    filtered.map((user, index) => (
                      <tr id={`user-row-${user.id}`} key={user.id}>
                        <td style={{ color: "var(--text-muted)" }}>{index + 1}</td>

                        {/* Name + Avatar */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div className="avatar">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                              {user.name}
                            </span>
                          </div>
                        </td>

                        <td>{user.email}</td>

                        {/* Role — inline edit (admin only) */}
                        <td>
                          {!readOnly && editRoleId === user.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <select
                                  className="form-select"
                                  style={{ width: "auto", padding: "5px 10px" }}
                                  value={editRoleValue}
                                  onChange={(e) => { setEditRoleValue(e.target.value); setEditWarehouseValue(""); }}
                                >
                                  {ROLE_OPTIONS.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                                <button className="btn-icon" style={{ color: "#10b981" }} onClick={() => handleChangeRole(user.id)}>
                                  <FiCheck size={13} />
                                </button>
                                <button className="btn-icon" onClick={() => setEditRoleId(null)}>
                                  <FiX size={13} />
                                </button>
                              </div>
                              {editRoleValue === "warehouse_manager" && (
                                <select
                                  className="form-select"
                                  style={{ width: "auto", padding: "5px 10px" }}
                                  value={editWarehouseValue}
                                  onChange={(e) => setEditWarehouseValue(e.target.value)}
                                >
                                  <option value="">— Select Warehouse —</option>
                                  {warehouses.map(w => (
                                    <option key={w.id} value={w.name}>{w.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <span className={`badge ${ROLE_BADGE_CLASS[user.role] || "badge-green"}`}>
                              {user.role === "superadmin" ? "👑" :
                               user.role === "admin" ? <FiShield size={10} /> :
                               user.role === "warehouse_manager" ? "🏭" :
                               <FiUser size={10} />}
                              {" "}
                              {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                            </span>
                          )}
                        </td>

                        {/* Warehouse column */}
                        <td>
                          {user.warehouse_name ? (
                            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                              📍 {user.warehouse_name}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                          )}
                        </td>

                        {/* Actions — hidden for superadmin */}
                        {!readOnly && (
                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                className="btn-icon"
                                title="Change Role"
                                onClick={() => {
                                  setEditRoleId(user.id);
                                  setEditRoleValue(user.role.toLowerCase());
                                  setEditWarehouseValue(user.warehouse_name || "");
                                  setDeleteConfirmId(null);
                                }}
                              >
                                <FiEdit2 size={13} />
                              </button>

                              {deleteConfirmId === user.id ? (
                                <span style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "12px", color: "var(--danger)" }}>
                                  Sure?
                                  <button className="btn-icon" style={{ color: "var(--danger)" }} onClick={() => handleDeleteUser(user.id)}>
                                    <FiCheck size={13} />
                                  </button>
                                  <button className="btn-icon" onClick={() => setDeleteConfirmId(null)}>
                                    <FiX size={13} />
                                  </button>
                                </span>
                              ) : (
                                <button
                                  className="btn-icon"
                                  title="Delete User"
                                  style={{ color: "var(--danger)" }}
                                  onClick={() => { setDeleteConfirmId(user.id); setEditRoleId(null); }}
                                >
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
          )}
        </div>

      </div>
    </div>
  );
}

export default Users;
