import { useEffect, useState } from "react";
import { getMyRegistrationsApi, cancelMyRegistrationApi } from "../api/registrationApi";
import { initiateKhaltiPaymentApi } from "../api/khaltiApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   color: "var(--warning)",  bg: "var(--warning-light)",  border: "var(--warning)",  icon: "⏳" },
  confirmed: { label: "Confirmed", color: "var(--success)",  bg: "var(--success-light)",  border: "var(--success)",  icon: "✅" },
  cancelled: { label: "Cancelled", color: "var(--danger)",   bg: "var(--danger-light)",   border: "var(--danger)",   icon: "❌" },
};

const FILTERS = ["All", "pending", "confirmed", "cancelled"];

const PAGE_SIZE = 5;

const MyRegistrations = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [cancelling, setCancelling] = useState(null);
  const [page, setPage] = useState(1);

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

  useEffect(() => { fetchData(); }, []);

  const [paying, setPaying] = useState(null);

  const handlePayNow = async (regId) => {
    setPaying(regId);
    try {
      const payRes = await initiateKhaltiPaymentApi(regId);
      window.location.href = payRes.data.payment_url;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate payment");
      setPaying(null);
    }
  };

  const handleCancel = async (regId) => {
    if (!window.confirm("Cancel this registration? Your ticket will also be cancelled.")) return;
    setCancelling(regId);
    try {
      await cancelMyRegistrationApi(regId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel registration");
    } finally {
      setCancelling(null);
    }
  };

  const filtered = activeFilter === "All"
    ? registrations
    : registrations.filter((r) => r.status === activeFilter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filter changes
  const handleFilterChange = (f) => { setActiveFilter(f); setPage(1); };

  const counts = {
    All: registrations.length,
    pending: registrations.filter((r) => r.status === "pending").length,
    confirmed: registrations.filter((r) => r.status === "confirmed").length,
    cancelled: registrations.filter((r) => r.status === "cancelled").length,
  };

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="page-banner">
        <div className="page-banner-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>My Registrations</h1>
            <p>{registrations.length} registration{registrations.length !== 1 ? "s" : ""} total</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {["pending", "confirmed", "cancelled"].map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{
                background: "var(--surface)", borderRadius: 12, padding: "16px 20px",
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
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
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
            icon="📋"
            title={activeFilter === "All" ? "No registrations yet" : "No matching registrations"}
            message={activeFilter === "All" ? "Browse events and register to see them here." : "Try a different filter."}
          />
        ) : (
          <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {paginated.map((reg) => {
              const cfg = STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending;
              const startDate = reg.eventId?.schedule?.startDateTime
                ? new Date(reg.eventId.schedule.startDateTime)
                : null;

              return (
                <div key={reg._id} style={{
                  background: "var(--surface)", borderRadius: 14,
                  border: "1px solid var(--border)",
                  borderLeft: `4px solid ${cfg.border}`,
                  boxShadow: "var(--shadow-sm)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "18px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>
                          {reg.eventId?.title || "Deleted Event"}
                        </h3>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {!reg.eventId && (
                            <span style={{ background: "var(--surface-raised)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                              🗑 Event Deleted
                            </span>
                          )}
                          {reg.eventId?.status === "CANCELLED" && (
                            <span style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                              🚫 Event Cancelled
                            </span>
                          )}
                          <span className={`badge badge-${reg.status}`}>{cfg.icon} {cfg.label}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", marginBottom: 10 }}>
                        {reg.eventId?.venue?.name && (
                          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>📍</span>{reg.eventId.venue.name}{reg.eventId.venue.city ? `, ${reg.eventId.venue.city}` : ""}
                          </span>
                        )}
                        {reg.eventId?.pricing && (
                          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                            <span>🎟</span>
                            {reg.eventId.pricing.type === "FREE" ? "Free" : `NPR ${reg.eventId.pricing.price?.toLocaleString()}`}
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 5 }}>
                          <span>🗓</span>Registered {new Date(reg.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        </span>
                      </div>

                      {reg.note && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 12px", background: "var(--bg-alt)", borderRadius: 8, margin: "0 0 10px" }}>
                          💬 {reg.note}
                        </p>
                      )}

                      {reg.status === "confirmed" && (
                        <button
                          onClick={() => handleCancel(reg._id)}
                          disabled={cancelling === reg._id}
                          style={{
                            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--danger)",
                            background: "var(--surface)", color: "var(--danger)", fontSize: 12, fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {cancelling === reg._id ? "Cancelling..." : "Cancel Registration"}
                        </button>
                      )}
                      {reg.status === "pending" && reg.eventId?.pricing?.type === "PAID" && reg.eventId?.status !== "CANCELLED" && reg.eventId?.status !== "COMPLETED" && reg.eventId && (
                        <button
                          onClick={() => handlePayNow(reg._id)}
                          disabled={paying === reg._id}
                          style={{
                            padding: "6px 14px", borderRadius: 8, border: "none",
                            background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                            color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          {paying === reg._id ? "Redirecting..." : "💳 Pay Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
                Next →
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyRegistrations;
