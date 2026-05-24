import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getOrganizerAnalyticsApi } from "../api/analyticsApi";
import { formatNPR } from "../utils/analyticsUtils";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

/* ── Status badge config ── */
const STATUS_STYLE = {
  PUBLISHED:        { label: "Live",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  PENDING_APPROVAL: { label: "Pending",   color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  DRAFT:            { label: "Draft",     color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0" },
  CANCELLED:        { label: "Cancelled", color: "#b91c1c", bg: "#fff1f2", border: "#fecdd3" },
  COMPLETED:        { label: "Completed", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.DRAFT;
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
};

/* ── Custom recharts tooltip ── */
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  const raw = payload[0].value;
  const display = formatter ? formatter(raw) : raw;
  return (
    <div style={{
      background: "#1e293b",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      fontSize: 13,
    }}>
      <div style={{ color: "#94a3b8", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ color: "#fff", fontWeight: 700 }}>{display}</div>
    </div>
  );
};

/* ── Summary card ── */
const MetricCard = ({ icon, label, value, accent, gradient }) => (
  <div style={{
    background: gradient,
    borderRadius: 16,
    padding: "22px 24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "relative",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.07)"; }}
  >
    {/* decorative circle */}
    <div style={{
      position: "absolute", top: -20, right: -20,
      width: 100, height: 100, borderRadius: "50%",
      background: "rgba(255,255,255,0.12)",
    }} />
    <div style={{
      width: 42, height: 42, borderRadius: 12,
      background: "rgba(255,255,255,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 20,
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: 26, fontWeight: 900, color: "#fff",
        lineHeight: 1.1, wordBreak: "break-word", letterSpacing: "-0.5px",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12, color: "rgba(255,255,255,0.8)",
        fontWeight: 600, marginTop: 4,
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </div>
    </div>
  </div>
);

/* ── Chart card wrapper ── */
const ChartCard = ({ title, subtitle, children }) => (
  <div style={{
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f1f5f9",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    padding: "24px 24px 16px",
  }}>
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

export default function OrganizerAnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState("30d");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await getOrganizerAnalyticsApi(timeWindow);
      setData(response.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeWindow]);

  if (loading) return <Loader />;

  /* ── Time window selector ── */
  const windowLabels = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

  const pageBanner = (
    <div className="page-banner">
      <div className="page-banner-inner" style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Analytics Dashboard</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.75, fontSize: 14 }}>
            Performance overview for your events
          </p>
        </div>
        <div style={{
          display: "flex", gap: 4,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 999, padding: 4,
        }}>
          {["7d", "30d", "90d"].map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              style={{
                padding: "6px 18px", borderRadius: 999,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "none",
                background: timeWindow === w ? "#fff" : "transparent",
                color: timeWindow === w ? "#4338ca" : "rgba(255,255,255,0.85)",
                boxShadow: timeWindow === w ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                transition: "all 0.2s",
              }}
            >
              {windowLabels[w]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (data?.perEventBreakdown?.length === 0) {
    return (
      <div>
        {pageBanner}
        <div className="container" style={{ paddingTop: 40 }}>
          <EmptyState
            icon="📊"
            title="No events yet"
            message="Create your first event to start seeing analytics here."
          />
        </div>
      </div>
    );
  }

  const s = data.summary;

  /* ── Axis tick formatter: shorten dates ── */
  const fmtDate = (d) => {
    if (!d) return "";
    const [, m, day] = d.split("-");
    return `${parseInt(m)}/${parseInt(day)}`;
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {pageBanner}

      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* ── Summary cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          <MetricCard
            icon="💰"
            label="Total Revenue"
            value={formatNPR(s.totalRevenue)}
            gradient="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)"
          />
          <MetricCard
            icon="🎟️"
            label="Ticket Sales"
            value={s.totalTicketSales.toLocaleString()}
            gradient="linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
          />
          <MetricCard
            icon="✅"
            label="Confirmed Registrations"
            value={s.totalConfirmedRegistrations.toLocaleString()}
            gradient="linear-gradient(135deg, #d97706 0%, #b45309 100%)"
          />
          <MetricCard
            icon="📍"
            label="Check-In Rate"
            value={`${s.overallCheckInRate}%`}
            gradient="linear-gradient(135deg, #0891b2 0%, #0e7490 100%)"
          />
        </div>

        {/* ── Charts row ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          marginBottom: 28,
        }}>
          <ChartCard
            title="Registration Trend"
            subtitle={`New registrations over the last ${windowLabels[timeWindow]}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.registrationTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Revenue Trend"
            subtitle={`Revenue earned over the last ${windowLabels[timeWindow]}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  content={<ChartTooltip formatter={(v) => formatNPR(v)} />}
                  cursor={{ stroke: "#16a34a", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Per-event breakdown table ── */}
        <div style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #f1f5f9",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Per-Event Breakdown
              </h2>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0", fontWeight: 500 }}>
                {data.perEventBreakdown.length} event{data.perEventBreakdown.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    ["Event", "left"],
                    ["Status", "left"],
                    ["Start Date", "left"],
                    ["Confirmed", "right"],
                    ["Pending", "right"],
                    ["Cancelled", "right"],
                    ["Tickets", "right"],
                    ["Check-Ins", "right"],
                    ["Check-In Rate", "right"],
                    ["Revenue", "right"],
                  ].map(([col, align]) => (
                    <th key={col} style={{
                      padding: "11px 16px",
                      textAlign: align,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                      borderBottom: "1px solid #f1f5f9",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.perEventBreakdown.map((ev, i) => (
                  <tr
                    key={ev.eventId}
                    style={{
                      borderBottom: i < data.perEventBreakdown.length - 1 ? "1px solid #f8fafc" : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafbff"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "13px 16px", fontWeight: 700, color: "#0f172a", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.title}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <StatusBadge status={ev.status} />
                    </td>
                    <td style={{ padding: "13px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                      {ev.startDate ? new Date(ev.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", color: "#15803d", fontWeight: 600 }}>
                      {ev.confirmedRegistrations}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", color: "#b45309", fontWeight: 600 }}>
                      {ev.pendingRegistrations}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", color: "#b91c1c", fontWeight: 600 }}>
                      {ev.cancelledRegistrations}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                      {ev.ticketSales}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                      {ev.checkIns}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: ev.checkInRate >= 75 ? "#f0fdf4" : ev.checkInRate >= 40 ? "#fffbeb" : "#f8fafc",
                        color: ev.checkInRate >= 75 ? "#15803d" : ev.checkInRate >= 40 ? "#b45309" : "#64748b",
                      }}>
                        {ev.checkInRate}%
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 700, color: "#4f46e5" }}>
                      {formatNPR(ev.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
