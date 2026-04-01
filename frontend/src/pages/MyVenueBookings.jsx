import { useEffect, useState } from "react";
import { getMyVenueBookingsApi } from "../api/venueApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "var(--warning)",      bg: "var(--warning-light)",  border: "var(--warning)",  icon: "⏳" },
  approved: { label: "Approved", color: "var(--success)",      bg: "var(--success-light)",  border: "var(--success)",  icon: "✅" },
  rejected: { label: "Rejected", color: "var(--danger)",       bg: "var(--danger-light)",   border: "var(--danger)",   icon: "❌" },
  cancelled:{ label: "Cancelled",color: "var(--text-muted)",   bg: "var(--surface-raised)", border: "var(--border)",   icon: "🚫" },
};

const MyVenueBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    getMyVenueBookingsApi()
      .then((res) => setBookings(res.data.data || []))
      .catch(() => setError("Failed to fetch venue bookings"))
      .finally(() => setLoading(false));
  }, []);

  const statuses = ["All", "pending", "approved", "rejected", "cancelled"];
  const counts = {
    All: bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    approved:  bookings.filter((b) => b.status === "approved").length,
    rejected:  bookings.filter((b) => b.status === "rejected").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const filtered = activeFilter === "All" ? bookings : bookings.filter((b) => b.status === activeFilter);

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>My Venue Bookings</h1>
          <p>{bookings.length} booking{bookings.length !== 1 ? "s" : ""} total</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
          {["pending", "approved", "rejected"].map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{
                background: "var(--surface)", borderRadius: "var(--radius)", padding: "16px 18px",
                border: `1px solid ${cfg.border}`, borderLeft: `4px solid ${cfg.border}`,
                boxShadow: "var(--shadow-sm)",
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{counts[s]}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{cfg.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {statuses.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "7px 16px", borderRadius: 999, border: "1.5px solid",
                fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                borderColor: activeFilter === f ? "var(--primary)" : "var(--border)",
                background: activeFilter === f ? "var(--primary)" : "var(--surface)",
                color: activeFilter === f ? "#fff" : "var(--text-secondary)",
              }}
            >
              {f === "All" ? "All" : STATUS_CONFIG[f].label} ({counts[f]})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="🏛️"
            title={activeFilter === "All" ? "No bookings yet" : `No ${activeFilter} bookings`}
            message={activeFilter === "All" ? "Your venue booking requests will appear here." : "Try a different filter."}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {filtered.map((booking) => {
              const cfg = STATUS_CONFIG[booking.status?.toLowerCase()] || STATUS_CONFIG.pending;
              const start = new Date(booking.startDateTime);
              const end = new Date(booking.endDateTime);
              return (
                <div key={booking._id} style={{
                  background: "var(--surface)", borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)", borderLeft: `4px solid ${cfg.border}`,
                  boxShadow: "var(--shadow-sm)", overflow: "hidden",
                  transition: "box-shadow 0.15s",
                }}>
                  <div style={{ padding: "20px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* Date block */}
                    <div style={{
                      minWidth: 56, textAlign: "center",
                      background: cfg.bg, borderRadius: "var(--radius)", padding: "10px 8px",
                      border: `1px solid ${cfg.border}`, flexShrink: 0,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{start.getDate()}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {start.toLocaleString("en-US", { month: "short" })}
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>
                          🏛️ {booking.venue?.name || "Venue"}
                        </h3>
                        <span className={`badge badge-${booking.status?.toLowerCase()}`}>{cfg.icon} {cfg.label}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6 }}>
                          📅 {start.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6 }}>
                          🏁 {end.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        {booking.venue?.location?.city && (
                          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6 }}>
                            📍 {booking.venue.location.city}
                          </span>
                        )}
                      </div>
                      {booking.rejectionReason && (
                        <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 8, padding: "8px 12px", background: "var(--danger-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--danger)" }}>
                          ⚠️ {booking.rejectionReason}
                        </p>
                      )}
                      {booking.notes && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, padding: "8px 12px", background: "var(--bg)", borderRadius: "var(--radius-sm)" }}>
                          💬 {booking.notes}
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

export default MyVenueBookings;
