import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  FiGrid,
  FiUpload,
  FiBox,
  FiCheckSquare,
  FiTruck,
  FiUsers,
  FiLogOut,
  FiBarChart2,
  FiPackage,
  FiMapPin,
  FiFileText,
  FiUserCheck,
  FiShield,
  FiEye,
  FiActivity,
  FiSun,
  FiMoon,
  FiMenu,
  FiX
} from "react-icons/fi";

const ROLE_CONFIG = {
  superadmin: {
    label: "Super Admin",
    icon: "👑",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)"
  },
  admin: {
    label: "Admin",
    icon: "🔑",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)"
  },
  warehouse_manager: {
    label: "Warehouse Manager",
    icon: "🏭",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)"
  },
  worker: {
    label: "Worker",
    icon: "👤",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)"
  }
};

function Navbar() {
  const location = useLocation();
  const [role, setRole] = useState(null);
  const [warehouseName, setWarehouseName] = useState("");

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // ── Mobile responsiveness (desktop behaviour is fully preserved when isMobile === false) ──
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close the drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedWH = localStorage.getItem("warehouse_name") || "";
    setRole(storedRole ? storedRole.toLowerCase() : null);
    setWarehouseName(storedWH);
  }, [location.pathname]);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem("theme") || "light");
    };
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const restoreScroll = () => {
      const scrollPos = localStorage.getItem("sidebarScrollPos");
      if (scrollPos) {
        const container = document.getElementById("sidebar-scroll-container");
        if (container) {
          container.scrollTop = parseInt(scrollPos, 10);
        }
      }
    };
    restoreScroll();
    const timer = setTimeout(restoreScroll, 50);
    return () => clearTimeout(timer);
  }, []);

  const isActive = (path) => {
    if (path.includes("?")) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path && !location.search;
  };

  const subLinkStyle = (path) => ({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    margin: "1px 12px 1px 32px",
    fontSize: "12.5px",
    fontWeight: isActive(path) ? "600" : "500",
    color: isActive(path) ? "var(--accent)" : "var(--text-secondary)",
    background: isActive(path) ? "var(--accent-soft)" : "transparent",
    transition: "all 0.15s"
  });

  const isAdminOrSuper = role === "admin" || role === "superadmin";
  const isWHManager = role === "warehouse_manager";
  const isSuperAdmin = role === "superadmin";

  const roleInfo = ROLE_CONFIG[role] || ROLE_CONFIG["worker"];

  const sidebarStyle = {
    width: "230px",
    height: "100vh",
    position: isMobile ? "fixed" : "sticky",
    top: 0,
    left: 0,
    background: "var(--bg-surface)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRight: "1px solid var(--border)",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    flexShrink: 0,
    zIndex: isMobile ? 1000 : "auto",
    transform: isMobile ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : "none",
    transition: isMobile ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
    boxShadow: isMobile && mobileOpen ? "0 0 40px rgba(0,0,0,0.3)" : "none"
  };

  const linkBase = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textDecoration: "none",
    padding: "11px 12px",
    borderRadius: "6px",
    margin: "2px 12px",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.15s"
  };

  const linkStyle = (path) => ({
    ...linkBase,
    color: isActive(path) ? "var(--accent)" : "var(--text-secondary)",
    background: isActive(path)
      ? "var(--accent-soft)"
      : "transparent",
    borderLeft: isActive(path)
      ? "3px solid var(--accent)"
      : "3px solid transparent"
  });

  return (
    <>
      {/* Mobile top bar with hamburger — desktop is completely unaffected since this only renders when isMobile */}
      {isMobile && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "52px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          zIndex: 999
        }}>
          <button
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-primary)",
              cursor: "pointer"
            }}
          >
            {mobileOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "var(--text-primary)", fontSize: "15px" }}>
            📦 Pragyawan
          </div>
        </div>
      )}

      {/* Backdrop overlay when the mobile drawer is open */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 998
          }}
        />
      )}

      <div style={sidebarStyle}>

        <div
          id="sidebar-scroll-container"
          onScroll={(e) => {
            localStorage.setItem("sidebarScrollPos", e.currentTarget.scrollTop);
          }}
          onClick={(e) => {
            // Auto-close the drawer on mobile when a nav link is tapped
            if (isMobile && e.target.closest("a")) {
              setMobileOpen(false);
            }
          }}
          style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}
        >
          {/* Logo */}
          <div style={{
            padding: "28px 20px 16px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "12px"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px"
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0
              }}>
                📦
              </div>
              <div>
                <div style={{ color: "var(--text-primary)", fontWeight: "700", fontSize: "18px" }}>
                  Pragyawan
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                  Technologies Limited
                </div>
              </div>
            </div>

            {/* Role Badge */}
            {role && (
              <div style={{
                padding: "8px 10px",
                borderRadius: "8px",
                background: roleInfo.bg,
                border: `1px solid ${roleInfo.color}22`,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: roleInfo.color
                }}>
                  <span>{roleInfo.icon}</span>
                  <span>{roleInfo.label}</span>
                  {isSuperAdmin && (
                    <span style={{
                      fontSize: "9px",
                      background: "rgba(245,158,11,0.2)",
                      color: "#f59e0b",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      marginLeft: "2px",
                      fontWeight: "700"
                    }}>VIEW ONLY</span>
                  )}
                </div>
                {isWHManager && warehouseName && (
                  <div style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "3px",
                    paddingLeft: "18px"
                  }}>
                    📍 {warehouseName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu label */}
          <div style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "1px",
            textTransform: "uppercase",
            padding: "0 24px",
            marginBottom: "8px"
          }}>
            Menu
          </div>

          {/* Dashboard — all roles */}
          <div>
            <Link to="/dashboard?tab=overview" style={linkStyle("/dashboard?tab=overview")}>
              <FiGrid size={16} />
              Dashboard
            </Link>
            {!isWHManager && (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "2px 0 6px" }}>
                <Link to="/dashboard?tab=offering" style={subLinkStyle("/dashboard?tab=offering")}>
                  • Trade Offering
                </Link>
                <Link to="/dashboard?tab=summary" style={subLinkStyle("/dashboard?tab=summary")}>
                  • Cumulative Summary
                </Link>
              </div>
            )}
          </div>

          {/* Upload — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/upload" style={linkStyle("/upload")}>
              <FiUpload size={16} />
              Upload
            </Link>
          )}

          {/* Upload Dashboard — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/upload-dashboard" style={linkStyle("/upload-dashboard")}>
              <FiBarChart2 size={16} />
              Upload Dashboard
            </Link>
          )}

          {/* Warehouses — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/warehouses" style={linkStyle("/warehouses")}>
              <FiMapPin size={16} />
              Warehouses
            </Link>
          )}

          {/* Kits Made — all roles */}
          <Link to="/kits" style={linkStyle("/kits")}>
            <FiBox size={16} />
            Kits Made
          </Link>

          {/* Inspection — all roles */}
          <Link to="/inspection" style={linkStyle("/inspection")}>
            <FiCheckSquare size={16} />
            Inspection
          </Link>

          {/* Dispatched — all roles */}
          <Link to="/dispatch" style={linkStyle("/dispatch")}>
            <FiTruck size={16} />
            Dispatched
          </Link>

          {/* Inventory — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/inventory" style={linkStyle("/inventory")}>
              <FiPackage size={16} />
              Inventory
            </Link>
          )}

          {/* Sample Inspection — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/sample-inspection" style={linkStyle("/sample-inspection")}>
              <FiFileText size={16} />
              Sample Inspection
            </Link>
          )}

          {/* Man Power — all roles */}
          <Link to="/man-power" style={linkStyle("/man-power")}>
            <FiUserCheck size={16} />
            Man Power
          </Link>

          {/* Activity Logs — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/activity-logs" style={linkStyle("/activity-logs")}>
              <FiActivity size={16} />
              Activity Logs
            </Link>
          )}

          {/* Account label */}
          <div style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "1px",
            textTransform: "uppercase",
            padding: "20px 24px 8px",
            marginTop: "12px",
            borderTop: "1px solid var(--border)"
          }}>
            Account
          </div>

          {/* Users — admin + superadmin only */}
          {isAdminOrSuper && (
            <Link to="/users" style={linkStyle("/users")}>
              <FiUsers size={16} />
              Users
              {isSuperAdmin && (
                <FiEye size={11} style={{ marginLeft: "auto", opacity: 0.5 }} />
              )}
            </Link>
          )}
        </div>

        {/* Logout */}
        <div style={{ padding: "8px 12px 24px" }}>
          <button
            onClick={() => {
              localStorage.clear();
              window.location = "/";
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
              e.currentTarget.style.color = "var(--danger)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.15s"
            }}
          >
            <FiLogOut size={16} />
            Logout
          </button>
        </div>

      </div>
    </>
  );
}

export default Navbar;