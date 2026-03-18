import { useEffect, useState } from "react";
import { getMyRegistrationsApi } from "../api/registrationApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";

const STATUS_CONFIG = {
  PENDING:  { label: "Pending",  color: "#92400e", bg: "#fef3c7", border: "#f59e0b", icon: "⏳" },
  APPROVED: { label: "Approved", color: "#166534", bg: "#dcfce7", border: "#22c55e", icon: "✅" },
  REJECTED: { label: "Rejected", color: "#991b1b", bg: "#fee2e2", border: "#ef4444", icon: "❌" },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.03em", whiteSpace: "nowrap", display: "inline-flex",
      alignItems: "center", gap: 5,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const FILTERS = ["All", "PENDING", "APPROVED", "REJECTED"];

const MyRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getMyRegistrationsApi();
        setRegistrations(res.data.data || []);
      } catch {
        setError("Failed to fetch registrations");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = activeFilter === "All"
    ? registrations
    : registrations.filter((r) => r.status === activeFilter);

  const counts = {
    All: registrations.length,
    PENDING: registrations.filter((r) => r.status === "PENDING").length,
    APPROVED: registrations.filter((r) => r.status === "APPROVED").length,
    REJECTED: registrations.filter((r) => r.status === "REJECTED").length,
  };

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header banner */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "40px 24px 36px",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            My Registrations
          </h1>
          <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>
            {registrations.length} registration{registrations.length !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {["PENDING", "APPROVED", "REJECTED"].map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{
                background: "#fff", borderRadius: 12, padding: "16px 20px",
                border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.border}`,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{counts[s]}</div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 2 }}>{cfg.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "7px 16px", borderRadius: 999, border: "1.5px solid",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                borderColor: activeFilter === f ? "var(--primary)" : "#d1d5db",
                background: activeFilter === f ? "var(--primary)" : "#fff",
                color: activeFilter === f ? "#fff" : "#374151",
              }}
            >
              {f === "All" ? "All" : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "64px 24px",
            background: "#fff", borderRadius: 16,
            border: "1px dashed #d1d5db",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 6 }}>
              {activeFilter === "All" ? "No registrations yet" : `No ${STATUS_CONFIG[activeFilter].label.toLowerCase()} registrations`}
            </p>
            <p style={{ fontSize: 14, color: "#64748b" }}>
              {activeFilter === "All"
                ? "Browse events and register to see them here."
                : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((reg) => {
              const cfg = STATUS_CONFIG[reg.status] || STATUS_CONFIG.PENDING;
              const startDate = reg.eventId?.schedule?.startDateTime
                ? new Date(reg.eventId.schedule.startDateTime)
                : null;

              return (
                <div key={reg._id} style={{
                  background: "#fff", borderRadius: 14,
                  border: "1px solid #e8ecf0",
                  borderLeft: `4px solid ${cfg.border}`,
                  boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "18px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    {/* Date block */}
                    {startDate && (
                      <div style={{
                        minWidth: 52, textAlign: "center",
                        background: cfg.bg, borderRadius: 10, padding: "8px 6px",
                        border: `1px solid ${cfg.border}`,
                      }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                          {startDate.getDate()}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {startDate.toLocaleString("en-US", { month: "short" })}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0, lineHeight: 1.3 }}>
                          {reg.eventId?.title || "Event"}
                        </h3>
                        <StatusBadge status={reg.status} />
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
                        {reg.eventId?.venue?.name && (
                          <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>📍</span>{reg.eventId.venue.name}{reg.eventId.venue.city ? `, ${reg.eventId.venue.city}` : ""}
                          </span>
                        )}
                        {reg.eventId?.pricing && (
                          <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>🎟</span>
                            {reg.eventId.pricing.type === "FREE" ? "Free" : `NPR ${reg.eventId.pricing.price?.toLocaleString()}`}
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>🗓</span>Registered {new Date(reg.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        </span>
                      </div>

                      {reg.note && (
                        <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, margin: "8px 0 0" }}>
                          💬 {reg.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRegistrations;
