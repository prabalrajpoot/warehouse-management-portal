// Shared role/auth helper utilities used across all pages

export function getRole() {
  return (localStorage.getItem("role") || "").toLowerCase();
}

export function getWarehouseName() {
  return localStorage.getItem("warehouse_name") || "";
}

export function isWarehouseManager() {
  return getRole() === "warehouse_manager";
}

export function isSuperAdmin() {
  return getRole() === "superadmin";
}

export function isAdmin() {
  return getRole() === "admin";
}

/**
 * Returns true if the current user can only view data (no add/edit/delete).
 * Currently only superadmin is read-only.
 */
export function isReadOnly() {
  return isSuperAdmin();
}

/**
 * For warehouse managers: filter an array of records to only their warehouse.
 * For all other roles: return the full array unfiltered.
 */
export function filterByWarehouse(records, warehouseKey = "warehouse_name") {
  if (!isWarehouseManager()) return records;
  const myWarehouse = getWarehouseName();
  if (!myWarehouse) return records;
  return records.filter(
    (r) => (r[warehouseKey] || "").trim().toLowerCase() === myWarehouse.trim().toLowerCase()
  );
}
