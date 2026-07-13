import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { FiRefreshCw, FiDatabase, FiLayers, FiList, FiActivity, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#3b82f6", "#a855f7", "#0ea5e9", "#22c55e", "#eab308"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: "8px", padding: "10px 14px", fontSize: "12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)"
      }}>
        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>Count: <strong>{p.value}</strong></div>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px" }}>
      <div style={{
        width: "44px", height: "44px", borderRadius: "12px",
        background: color + "18", display: "flex", alignItems: "center",
        justifyContent: "center", color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function UploadDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const r = await api.get("/upload-stats");
      setStats(r.data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds for real-time feel
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const noData = !stats || stats.total_rows === 0;

  const exportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Upload Analytics Summary Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Total Rows: ${stats.total_rows}`, 20, 28);
    doc.text(`Total Columns: ${stats.columns.length}`, 20, 34);
    doc.line(20, 38, 190, 38);

    let yPos = 46;
    stats.columns.forEach((col) => {
      const lowerCol = col.toLowerCase().replace(/[\s._-]/g, "");
      // Skip S.No., Dispatched, Date etc. as per request
      if (lowerCol === "sno" || lowerCol === "srno" || lowerCol === "dispatched" || lowerCol === "date") {
        return;
      }
      const colStat = stats.stats[col];
      if (!colStat) return;

      if (yPos > 260) { doc.addPage(); yPos = 20; }

      doc.setFont("helvetica", "bold");
      doc.text(`${col} (${colStat.type.toUpperCase()})`, 20, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 6;

      if (colStat.type === "categorical") {
        doc.text(`Unique Values: ${colStat.unique}`, 25, yPos);
        yPos += 6;
        const entries = Object.entries(colStat.counts).slice(0, 10); // Limit to top 10 for neatness
        const countsStr = entries.map(([name, count]) => `${name}: ${count}`).join(" | ");
        doc.text(`Distribution: ${countsStr}`, 25, yPos);
        yPos += 10;
      } else if (colStat.type === "numeric") {
        doc.text(`Count: ${colStat.count} | Min: ${colStat.min} | Max: ${colStat.max}`, 25, yPos);
        yPos += 6;
        doc.text(`Sum: ${colStat.sum} | Average: ${colStat.avg.toFixed(2)}`, 25, yPos);
        yPos += 10;
      }
    });

    doc.save("upload_analytics_report.pdf");
  };

  const exportExcel = () => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Column Stats
    const summaryData = stats.columns
      .map((col) => {
        const lowerCol = col.toLowerCase().replace(/[\s._-]/g, "");
        if (lowerCol === "sno" || lowerCol === "srno" || lowerCol === "dispatched" || lowerCol === "date") {
          return null;
        }
        const colStat = stats.stats[col];
        if (!colStat) return null;

        return {
          "Column Name": col,
          "Data Type": colStat.type,
          "Unique Values Count": colStat.type === "categorical" ? colStat.unique : "—",
          "Record Count": colStat.type === "numeric" ? colStat.count : "—",
          "Sum": colStat.type === "numeric" ? colStat.sum : "—",
          "Average": colStat.type === "numeric" ? colStat.avg : "—",
          "Min": colStat.type === "numeric" ? colStat.min : "—",
          "Max": colStat.type === "numeric" ? colStat.max : "—"
        };
      })
      .filter(Boolean);

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Columns Summary");

    // Sheet 2: Categorical Distributions
    const distributionData = [];
    stats.columns.forEach((col) => {
      const lowerCol = col.toLowerCase().replace(/[\s._-]/g, "");
      if (lowerCol === "sno" || lowerCol === "srno" || lowerCol === "dispatched" || lowerCol === "date") {
        return;
      }
      const colStat = stats.stats[col];
      if (colStat && colStat.type === "categorical") {
        Object.entries(colStat.counts).forEach(([val, count]) => {
          distributionData.push({
            "Column Name": col,
            "Value": val,
            "Count": count
          });
        });
      }
    });

    if (distributionData.length > 0) {
      const wsDist = XLSX.utils.json_to_sheet(distributionData);
      XLSX.utils.book_append_sheet(wb, wsDist, "Category Distribution");
    }

    XLSX.writeFile(wb, "upload_analytics_report.xlsx");
  };

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Upload Dashboard</h1>
            <p className="page-subtitle">
              Dynamic visual analytics from your uploaded file data
              {lastRefresh && <span style={{ marginLeft: "8px", color: "var(--text-muted)", fontSize: "11px" }}>
                — Last updated: {lastRefresh}
              </span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {!noData && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={exportPDF}>
                  <FiDownload size={13} /> PDF
                </button>
                <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
                  <FiDownload size={13} /> Excel
                </button>
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={fetchStats} disabled={loading}>
              <FiRefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
            <div style={{ color: "var(--text-secondary)" }}>Loading analytics...</div>
          </div>
        )}

        {!loading && noData && (
          <div className="card" style={{ textAlign: "center", padding: "64px 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📁</div>
            <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)", marginBottom: "8px" }}>
              No Upload Data Found
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "360px", margin: "0 auto" }}>
              Please go to the Upload page and upload an Excel file to see analytics here.
            </p>
          </div>
        )}

        {!loading && !noData && (
          <>
            {/* Per-Column Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "16px" }}>
              {stats.columns.map((col) => {
                const lowerCol = col.toLowerCase().replace(/[\s._-]/g, "");
                if (lowerCol === "sno" || lowerCol === "srno" || lowerCol === "dispatched" || lowerCol === "date") {
                  return null;
                }

                const colStat = stats.stats[col];
                if (!colStat) return null;

                if (colStat.type === "categorical" && Object.keys(colStat.counts).length > 0) {
                  const chartData = Object.entries(colStat.counts).map(([name, count]) => ({ name, count }));
                  return (
                    <div className="card" key={col}>
                      <div className="card-title" style={{ marginBottom: "4px" }}>{col}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
                        {colStat.unique} unique values
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" fill={COLORS[stats.columns.indexOf(col) % COLORS.length]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                }

                if (colStat.type === "numeric") {
                  return (
                    <div className="card" key={col}>
                      <div className="card-title" style={{ marginBottom: "12px" }}>{col} — Numeric Summary</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {[
                          { label: "Sum", value: colStat.sum.toLocaleString() },
                          { label: "Average", value: colStat.avg.toLocaleString() },
                          { label: "Min", value: colStat.min.toLocaleString() },
                          { label: "Max", value: colStat.max.toLocaleString() },
                        ].map(({ label, value }) => (
                          <div key={label} style={{
                            background: "var(--bg-muted)", borderRadius: "8px",
                            padding: "14px", textAlign: "center"
                          }}>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--accent)" }}>{value}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px" }}>
                        Based on {colStat.count} non-null values
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default UploadDashboard;
