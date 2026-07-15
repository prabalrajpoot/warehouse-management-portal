import React from "react";

function Loader({ message = "Loading data..." }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "300px",
      gap: "16px",
      background: "var(--bg-surface)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      margin: "20px 0",
      boxShadow: "var(--shadow)",
      padding: "40px",
      width: "100%"
    }}>
      <div className="loading-spinner" style={{
        width: "44px",
        height: "44px",
        border: "4px solid var(--accent-soft)",
        borderTop: "4px solid var(--accent)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", textAlign: "center" }}>
        {message}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Loader;
