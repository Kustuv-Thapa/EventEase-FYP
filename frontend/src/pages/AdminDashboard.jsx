import { useEffect, useState } from "react";
import { getAdminRegistrationsApi, approveRegistrationApi, adminEventRegistrationsApi } from "../api/registrationApi";
import { getAdminPendingEventsApi, adminApproveEventApi, adminRejectEventApi, getAdminAllEventsApi } from "../api/eventApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

const TABS = [
  { key: "events",        label: "Event Approvals",     icon: "🎪", color: "#d97706", bg: "#fffbeb" },
  { key: "registrations", label: "Registrations",       icon: "📋", color: "#0891b2", bg: "#ecfeff" },
  { key: "eventregs",     label: "Event Registrations", icon: "📊", color: "#16a34a", bg: "#f0fdf4" },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

const ActionBtn = ({ onClick, children, variant = "success", disabled }) => {
  const styles = {
    success: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
    danger:  { bg: "#fff1f2", color: "#b91c1c", border: "#fecdd3" },
    primary: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  };
  const s = styles[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "6px 14px", borderRadius: 8, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, fontWeight: 700, fontSize: 12,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      whiteSpace: "nowrap",
    }}>
      {children}
    </button>
  );
};

export default function AdminDashboard() {
  const [registrations, setRegistrations] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventRegs, setEventRegs] = useState(null);
  const [eventRegsLoading, setEventRegsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState({});
  const [activeTab, setActiveTab] = useState("events");
  const [approvalInfo, setApprovalInfo] = useState(null);
  const [eventSearch, setEventSearch] = useState("");

  const fetchData = async () => {
    try {
      const [rRes, eRes, allEvRes] = await Promise.all([
        getAdminRegistrationsApi({ status: "pending" }),
        getAdminPendingEventsApi(),
        getAdminAllEventsApi().catch(() => ({ data: { data: { items: [] } } })),
      ]);
      setRegistrations(rRes.data.data?.items || []);
      setPendingEvents(eRes.data.data?.items || []);
      setAllEvents(allEvRes.data.data?.items || []);
    } catch { setError("Failed to load dashboard data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveEvent = async (id) => {
    try {
      setError(""); setApprovalInfo(null);
      const res = await adminApproveEventApi(id);
      const { autoRejectedBookings, eventsToDraft } = res.data;
      if (autoRejectedBookings > 0) setApprovalInfo({ autoRejected: autoRejectedBookings, eventsToDraft });
      fetchData();
    } catch (err) { setError(err.response?.data?.message || "Approval failed"); }
  };

  const handleRejectEvent = async (id) => {
    const reason = rejectReason[id];
    if (!reason || reason.trim().length < 3) { setError("Enter a rejection reason (min 3 chars)"); return; }
    try { setError(""); await adminRejectEventApi(id, reason); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Rejection failed"); }
  };

  const handleRegistrationDecision = async (id, status) => {
    try { await approveRegistrationApi(id, { status }); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Decision failed"); }
  };

  const handleLoadEventRegs = async () => {
    if (!selectedEventId) return;
    setEventRegsLoading(true);
    try { const res = await adminEventRegistrationsApi(selectedEventId); setEventRegs(res.data.data); }
    catch (err) { setError(err.response?.data?.message || "Failed to load"); }
    finally { setEventRegsLoading(false); }
  };

  if (loading) return <Loader />;

  const counts = { events: pendingEvents.length, registrations: registrations.length };
  const totalPending = counts.events + counts.registrations;
  const setReason = (id, val) => setRejectReason((p) => ({ ...p, [id]: val }));

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>Admin Dashboard</h1>
          <p>{totalPending > 0 ? `${totalPending} item${totalPending !== 1 ? "s" : ""} need your attention` : "Everything is up to date ✓"}</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Auto-rejection info banner */}
        {approvalInfo && approvalInfo.autoRejected > 0 && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1d4ed8", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>ℹ️ {approvalInfo.autoRejected} conflicting booking{approvalInfo.autoRejected !== 1 ? "s were" : " was"} automatically rejected{approvalInfo.eventsToDraft > 0 ? ` and ${approvalInfo.eventsToDraft} event${approvalInfo.eventsToDraft !== 1 ? "s were" : " was"} returned to draft` : ""}.</span>
            <button onClick={() => setApprovalInfo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontWeight: 700, fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Events to Review",      value: counts.events,        icon: "🎪", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            { label: "Pending Registrations", value: counts.registrations, icon: "📋", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
          ].map(({ label, value, icon, color, bg, border }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "var(--radius-lg)", padding: "22px 24px",
              border: `1px solid ${border}`, borderLeft: `4px solid ${color}`,
              boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f1f5f9", padding: 5, borderRadius: "var(--radius)", border: "1px solid var(--border)", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            const cnt = counts[t.key];
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                flex: 1, minWidth: 120, padding: "9px 14px", borderRadius: 8, border: "none",
                cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                background: isActive ? "#fff" : "transparent",
                color: isActive ? t.color : "var(--text-muted)",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {cnt > 0 && (
                  <span style={{
                    background: isActive ? t.bg : "#e2e8f0",
                    color: isActive ? t.color : "#64748b",
                    border: `1px solid ${isActive ? t.color + "40" : "#cbd5e1"}`,
                    borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                  }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Event Approvals tab */}
        {activeTab === "events" && (
          <>
            {/* Search bar */}
            {pendingEvents.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Search by event title or organizer name..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  style={{ width: "100%", maxWidth: 500, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", fontSize: 14 }}
                />
              </div>
            )}

            {pendingEvents.filter(ev =>
              !eventSearch ||
              ev.title?.toLowerCase().includes(eventSearch.toLowerCase()) ||
              ev.organizerId?.name?.toLowerCase().includes(eventSearch.toLowerCase()) ||
              ev.organizerId?.email?.toLowerCase().includes(eventSearch.toLowerCase())
            ).length === 0 ? (
              eventSearch ? (
                <EmptyState icon="🔍" title="No matches" message={`No events match "${eventSearch}"`} />
              ) : (
                <EmptyState icon="✅" title="All clear" message="No events pending approval." />
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pendingEvents.filter(ev =>
                  !eventSearch ||
                  ev.title?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                  ev.organizerId?.name?.toLowerCase().includes(eventSearch.toLowerCase()) ||
                  ev.organizerId?.email?.toLowerCase().includes(eventSearch.toLowerCase())
                ).map((ev) => (
                  <div key={ev._id} style={{
                    background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid #fde68a",
                    borderLeft: "4px solid #d97706", boxShadow: "var(--shadow-sm)", overflow: "hidden",
                  }}>
                    <div style={{ padding: "18px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 3 }}>🎪 {ev.title}</div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{ev.organizerId?.name} · {ev.organizerId?.email}</div>
                        </div>
                        <span style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>⏳ Pending Approval</span>
                      </div>
                      <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--text-secondary)", flexWrap: "wrap", marginBottom: 14 }}>
                        <span>📍 {ev.venue?.name}{ev.venue?.city ? `, ${ev.venue.city}` : ""}</span>
                        <span>📅 {fmtDateTime(ev.schedule?.startDateTime)}</span>
                        <span>🏁 {fmtDateTime(ev.schedule?.endDateTime)}</span>
                        <span>🎟 {ev.pricing?.type === "FREE" ? "Free" : `NPR ${ev.pricing?.price?.toLocaleString()}`}</span>
                        <span>👥 {ev.capacity} seats</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <ActionBtn onClick={() => handleApproveEvent(ev._id)} variant="success">✓ Approve</ActionBtn>
                        <input
                          type="text" placeholder="Rejection reason (min 3 chars)…"
                          value={rejectReason[ev._id] || ""}
                          onChange={(e) => setReason(ev._id, e.target.value)}
                          style={{ flex: 1, minWidth: 200, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, background: "#fff" }}
                        />
                        <ActionBtn onClick={() => handleRejectEvent(ev._id)} variant="danger" disabled={!rejectReason[ev._id] || rejectReason[ev._id].trim().length < 3}>✕ Reject</ActionBtn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Registrations tab */}
        {activeTab === "registrations" && (
          registrations.length === 0
            ? <EmptyState icon="✅" title="All clear" message="No pending registration requests." />
            : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {registrations.map((reg) => (
                  <div key={reg._id} style={{
                    background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid #a5f3fc",
                    borderLeft: "4px solid #0891b2", boxShadow: "var(--shadow-sm)", padding: "18px 22px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 3 }}>🎪 {reg.eventId?.title}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{reg.userId?.name} · {reg.userId?.email}</div>
                      </div>
                      <span style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>⏳ Pending</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                      Registered {fmtDate(reg.createdAt)}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <ActionBtn onClick={() => handleRegistrationDecision(reg._id, "confirmed")} variant="success">✓ Confirm</ActionBtn>
                      <ActionBtn onClick={() => handleRegistrationDecision(reg._id, "cancelled")} variant="danger">✕ Cancel</ActionBtn>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Event Registrations tab */}
        {activeTab === "eventregs" && (
          <div>
            <div style={{
              background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
              padding: "20px 22px", marginBottom: 24, boxShadow: "var(--shadow-sm)",
              display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>Select event:</span>
              <select value={selectedEventId} onChange={(e) => { setSelectedEventId(e.target.value); setEventRegs(null); }} style={{ flex: 1, minWidth: 240 }}>
                <option value="">— Choose an event —</option>
                {allEvents.map((ev) => (
                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                ))}
              </select>
              <button onClick={handleLoadEventRegs} disabled={!selectedEventId || eventRegsLoading} className="btn btn-primary btn-sm">
                {eventRegsLoading ? "Loading…" : "Load Registrations"}
              </button>
            </div>

            {eventRegs && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                  {[
                    { label: "Total Registered", value: eventRegs.stats.totalConfirmed, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
                    { label: "Checked In",        value: eventRegs.stats.totalCheckedIn, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                    { label: "Not Checked In",    value: eventRegs.stats.remaining,      color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} style={{
                      background: "#fff", borderRadius: "var(--radius)", padding: "18px 20px",
                      border: `1px solid ${border}`, borderLeft: `4px solid ${color}`, boxShadow: "var(--shadow-sm)",
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {eventRegs.registrations.length === 0 ? (
                  <EmptyState icon="📋" title="No registrations" message="No registrations for this event." />
                ) : (
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 1fr auto",
                      padding: "10px 20px", background: "#f8fafc",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.06em", gap: 16,
                    }}>
                      <span>Attendee</span><span>Email</span><span>Status</span>
                    </div>
                    {eventRegs.registrations.map((reg, i) => (
                      <div key={reg._id} style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr auto",
                        padding: "12px 20px", gap: 16, alignItems: "center",
                        background: "#fff", borderBottom: i < eventRegs.registrations.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{reg.userId?.name}</div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{reg.userId?.email}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span className={`badge badge-${reg.status}`}>{reg.status}</span>
                          {reg.ticketStatus && <span className="badge badge-draft">🎟 {reg.ticketStatus}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
