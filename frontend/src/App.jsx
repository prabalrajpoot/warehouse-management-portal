import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Trade from "./pages/Trade";
import Kits from "./pages/Kits";
import Inspection from "./pages/Inspection";
import Dispatch from "./pages/Dispatch";
import Upload from "./pages/Upload";
import Users from "./pages/Users";
import Inventory from "./pages/Inventory";
import UploadDashboard from "./pages/UploadDashboard";
import Warehouses from "./pages/Warehouses";
import SampleInspection from "./pages/SampleInspection";
import ManPower from "./pages/ManPower";
import ActivityLogs from "./pages/ActivityLogs";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        {/* ── Available to ALL logged-in roles ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kits"
          element={
            <ProtectedRoute>
              <Kits />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection"
          element={
            <ProtectedRoute>
              <Inspection />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dispatch"
          element={
            <ProtectedRoute>
              <Dispatch />
            </ProtectedRoute>
          }
        />

        <Route
          path="/man-power"
          element={
            <ProtectedRoute>
              <ManPower />
            </ProtectedRoute>
          }
        />

        {/* ── Admin + Superadmin only ── */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <Upload />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload-dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <UploadDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouses"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <Warehouses />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <Inventory />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sample-inspection"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <SampleInspection />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trade"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <Trade />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <Users />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute>
              <RoleRoute requiredRoles={["admin", "superadmin"]}>
                <ActivityLogs />
              </RoleRoute>
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;