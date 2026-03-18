import { useEffect, useState } from "react";
import { getAdminBookingsApi, approveVenueBookingApi, rejectVenueBookingApi } from "../api/venueApi";
import { getAdminRegistrationsApi, approveRegistrationApi } from "../api/registrationApi";
import { getAdminPendingEventsApi, adminApproveEventApi, adminRejectEventApi } from "../api/eventApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";

const TABS = [
  { key: "bookings",      label: "Venue Bookings",  icon: "🏛️" },
  { key: "registrations", label: "Registrations",   icon: "📋" },
  { key: "events",        label: "Event Approvals", icon: "🎪" },
];

const EmptyState = ({ icon, text }) => (
  <div style={{ textAlign: "center", padding: "52px 24px", color: "#64748b" }}>
    <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
    <p style={{ fontWeight: 600, fontSize: 15 }}>{text}</p>
  </div>
);

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState({});
  const [activeTab, setActiveTab] = useState("bookings");

  const fetchData = async () => {
    try {
      const [bRes, rRes, eRes] = await Promise.all([
        getAdminBookingsApi({ status: "pending" }),
        getAdminRegistrationsApi({ status: "PENDING" }),
        getAdminPendingEventsApi(),
      ]);
      setBookings(bRes.data.data || []);
      setRegistrations(rRes.data.data?.items || []);
      setPendingEvents(eRes.data.data?.items || []);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveBooking = async (id) => {
    try { await approveVenueBookingApi(id); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Approval failed"); }
  };

  const handleRejectBooking = async (id) => {
    const reason = rejectReason[id];
    if (!reason || reason.trim().length < 3) { setError("Enter a rejection reason (min 3 chars)"); return; }
    try { setError(""); await rejectVenueBookingApi(id, reason); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Rejection failed"); }
  };

  const handleRegistrationDecision = async (id, status) => {
    try { await approveRegistrationApi(id, { status }); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Decision failed"); }
  };

  const handleApproveEvent = async (id) => {
    try { setError(""); await adminApproveEventApi(id); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Approval failed"); }
  };

  const handleRejectEvent = async (id) => {
    const reason = rejectReason[id];
    if (!reason || reason.trim().length < 3) { setError("Enter a rejection reason (min 3 chars)"); return; }
    try { setError(""); await adminRejectEventApi(id, reason); fetchData(); }
    catch (err) { setError(err.response?.data?.message || "Rejection failed"); }
  };

  if (loading) return <Loader />;

  const counts = { bookings: bookings.length, registrations: registrations.length, events: pendingEvents.length };
  const totalPending = counts.bookings + counts.registrations + counts.events;

  const setReason = (id, val) => setRejectReason((p) => ({ ...p, [id]: val }));

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "40px 24px 36px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: 0 }}>
            {totalPending} item{totalPending !== 1 ? "s" : ""} pending review
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Pending Bookings",      value: counts.bookings,      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
            { label: "Pending Registrations", value: counts.registrations, color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
            { label: "Pending Events",        value: counts.events,        color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#fff", borderRadius: 12, padding: "18px 22px",
              border: `1px solid ${s.border}`, borderLeft: `4px solid ${s.color}`,
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "#fff", padding: 6, borderRadius: 12, border: "1px solid #e8ecf0", width: "fit-content" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, transition: "all 0.15s",
              background: activeTab === t.key ? "var(--primary)" : "transparent",
              color: activeTab === t.key ? "#fff" : "#64748b",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {t.icon} {t.label}
              {counts[t.key] > 0 && (
                <span style={{
                  background: activeTab === t.key ? "rgba(255,255,255,0.25)" : "#fee2e2",
                  color: activeTab === t.key ? "#fff" : "#991b1b",
                  borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 800,
                }}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings tab */}
        {activeTab === "bookings" && (
          bookings.length === 0
            ? <EmptyState icon="✅" text="No pending venue booking requests." />
            : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bookings.map((b) => (
                  <div key={b._id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf0", borderLeft: "4px solid #7c3aed", padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 3 }}>🏛️ {b.venue?.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {b.requestedBy?.name} · <span style={{ color: "#94a3b8" }}>{b.requestedBy?.email}</span>
                        </div>
                      </div>
                      <span style={{ background: "#f5f3ff", color: "#5b21b6", border: "1px solid #ddd6fe", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, height: "fit-content" }}>
                        ⏳ Pending
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#475569", marginBottom: 14, flexWrap: "wrap" }}>
                      <span>📅 From: {new Date(b.startDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span>📅 To: {new Date(b.endDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={() => handleApproveBooking(b._id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                      <input type="text" placeholder="Rejection reason..." value={rejectReason[b._id] || ""} onChange={(e) => setReason(b._id, e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 180 }} />
                      <button onClick={() => handleRejectBooking(b._id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Registrations tab */}
        {activeTab === "registrations" && (
          registrations.length === 0
            ? <EmptyState icon="✅" text="No pending registration requests." />
            : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {registrations.map((reg) => (
                  <div key={reg._id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf0", borderLeft: "4px solid #0891b2", padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 3 }}>🎪 {reg.eventId?.title}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {reg.userId?.name} · <span style={{ color: "#94a3b8" }}>{reg.userId?.email}</span>
                        </div>
                      </div>
                      <span style={{ background: "#ecfeff", color: "#164e63", border: "1px solid #a5f3fc", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, height: "fit-content" }}>
                        ⏳ Pending
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>
                      Registered {new Date(reg.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleRegistrationDecision(reg._id, "APPROVED")} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                      <button onClick={() => handleRegistrationDecision(reg._id, "REJECTED")} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Events tab */}
        {activeTab === "events" && (
          pendingEvents.length === 0
            ? <EmptyState icon="✅" text="No events pending approval." />
            : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pendingEvents.map((ev) => (
                  <div key={ev._id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ecf0", borderLeft: "4px solid #d97706", padding: "18px 22px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 3 }}>🎪 {ev.title}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {ev.organizerId?.name} · <span style={{ color: "#94a3b8" }}>{ev.organizerId?.email}</span>
                        </div>
                      </div>
                      <span style={{ background: "#fffbeb", color: "#78350f", border: "1px solid #fde68a", borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700, height: "fit-content" }}>
                        ⏳ Pending Approval
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#475569", marginBottom: 14, flexWrap: "wrap" }}>
                      <span>📅 {new Date(ev.schedule?.startDateTime).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                      <span>📍 {ev.venue?.name}, {ev.venue?.city}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={() => handleApproveEvent(ev._id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#dcfce7", color: "#166534", fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                      <input type="text" placeholder="Rejection reason..." value={rejectReason[ev._id] || ""} onChange={(e) => setReason(ev._id, e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 180 }} />
                      <button onClick={() => handleRejectEvent(ev._id)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 13 }}>✕ Reject</button>
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
