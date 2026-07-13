import { Navigate } from "react-router-dom";
import { getRole } from "../utils/auth";

/**
 * RoleRoute — wraps a page and only allows users whose role is in `requiredRoles`.
 * If the user's role is not allowed, redirect them to /dashboard.
 *
 * Usage:
 *   <RoleRoute requiredRoles={["admin", "superadmin"]}>
 *     <SomePage />
 *   </RoleRoute>
 */
function RoleRoute({ children, requiredRoles }) {
  const role = getRole();
  if (!requiredRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default RoleRoute;
