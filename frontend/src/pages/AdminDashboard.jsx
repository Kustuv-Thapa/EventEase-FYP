import { useEffect, useState } from "react";
import { getAdminRegistrationsApi, approveRegistrationApi, adminEventRegistrationsApi } from "../api/registrationApi";
import { getAdminPendingEventsApi, adminApproveEventApi, adminRejectEventApi, getAdminAllEventsApi } from "../api/eventApi";
import { adminGetEventFeedbackApi, adminHideFeedbackApi, adminDeleteFeedbackApi } from "../api/feedbackApi";
import { adminGetUsersApi, adminGetUserStatsApi, adminUpdateUserRoleApi, adminVerifyUserApi, adminDeleteUserApi } from "../api/userApi";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import StarRating from "../components/StarRating";
import ConfirmModal from "../components/ConfirmModal";

const TABS = [
  { key: "events",        label: "Event Approvals",     icon: "🎪", color: "#d97706", bg: "#fffbeb" },
  { key: "registrations", label: "Registrations",       icon: "📋", color: "#0891b2", bg: "#ecfeff" },
  { key: "eventregs",     label: "Event Registrations", icon: "📊", color: "#16a34a", bg: "#f0fdf4" },
  { key: "feedback",      label: "Feedback Moderation", icon: "⭐", color: "#7c3aed", bg: "#f5f3ff" },
  { key: "users",         label: "User Management",     icon: "👥", color: "#0f172a", bg: "#f8fafc" },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu", dateStyle: "medium" }) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { timeZone: "Asia/Kathmandu", dateStyle: "medium", timeStyle: "short" }) : "—";

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
  const [rejectReason, setRejectReason] = useState({});
  const [activeTab, setActiveTab] = useState("events");
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [approvalInfo, setApprovalInfo] = useState(null);
  const [eventSearch, setEventSearch] = useState("");

  // Feedback moderation state
  const [feedbackEventId, setFeedbackEventId] = useState("");
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // User management state
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(null);

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
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === "users" && users.length === 0 && !usersLoading) {
      fetchUsers(1);
    }
  }, [activeTab]);

  const handleApproveEvent = async (id) => {
    try {
      setApprovalInfo(null);
      const res = await adminApproveEventApi(id);
      const { autoRejectedBookings, eventsToDraft } = res.data;
      if (autoRejectedBookings > 0) setApprovalInfo({ autoRejected: autoRejectedBookings, eventsToDraft });
      toast.success("Event approved successfully!");
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Approval failed"); }
  };

  const handleRejectEvent = async (id) => {
    const reason = rejectReason[id];
    if (!reason || reason.trim().length < 3) { toast.error("Enter a rejection reason (min 3 chars)"); return; }
    try { await adminRejectEventApi(id, reason); toast.success("Event rejected"); fetchData(); }
    catch (err) { toast.error(err.response?.data?.message || "Rejection failed"); }
  };

  const handleRegistrationDecision = async (id, status) => {
    try {
      await approveRegistrationApi(id, { status });
      toast.success(`Registration ${status === "confirmed" ? "confirmed" : "cancelled"} successfully`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || "Decision failed"); }
  };

  const handleLoadEventRegs = async () => {
    if (!selectedEventId) return;
    setEventRegsLoading(true);
    try { const res = await adminEventRegistrationsApi(selectedEventId); setEventRegs(res.data.data); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to load registrations"); }
    finally { setEventRegsLoading(false); }
  };

  const handleLoadFeedback = async () => {
    if (!feedbackEventId) return;
    setFeedbackLoading(true);
    try {
      const res = await adminGetEventFeedbackApi(feedbackEventId);
      setFeedbackData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleHideFeedback = async (feedbackId) => {
    try {
      await adminHideFeedbackApi(feedbackId);
      toast.success("Feedback hidden successfully");
      // Refresh the list
      const res = await adminGetEventFeedbackApi(feedbackEventId);
      setFeedbackData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to hide feedback");
    }
  };

  const handleAdminDeleteFeedback = async (feedbackId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Review",
      message: "Permanently delete this review? This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try {
          await adminDeleteFeedbackApi(feedbackId);
          toast.success("Feedback deleted successfully");
          const res = await adminGetEventFeedbackApi(feedbackEventId);
          setFeedbackData(res.data.data);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete feedback");
        }
      },
    });
  };

  // ── User management handlers ──
  const fetchUsers = async (page = 1, search = userSearch, role = userRoleFilter) => {
    setUsersLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (role) params.role = role;
      const [usersRes, statsRes] = await Promise.all([
        adminGetUsersApi(params),
        userStats ? Promise.resolve(null) : adminGetUserStatsApi(),
      ]);
      setUsers(usersRes.data.data.items);
      setUserPagination(usersRes.data.data.pagination);
      if (statsRes) setUserStats(statsRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers(1, userSearch, userRoleFilter);
  };

  const handleRoleFilterChange = (role) => {
    setUserRoleFilter(role);
    setUserPage(1);
    fetchUsers(1, userSearch, role);
  };

  const handleUserPageChange = (newPage) => {
    setUserPage(newPage);
    fetchUsers(newPage, userSearch, userRoleFilter);
  };

  const handleUpdateRole = async (userId, newRole) => {
    setUserActionLoading(userId + "_role");
    try {
      await adminUpdateUserRoleApi(userId, newRole);
      toast.success("User role updated successfully");
      fetchUsers(userPage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update role");
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleVerifyUser = async (userId) => {
    setUserActionLoading(userId + "_verify");
    try {
      await adminVerifyUserApi(userId);
      toast.success("User verified successfully");
      fetchUsers(userPage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify user");
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete User",
      message: `Delete user "${userName}"? This cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        setUserActionLoading(userId + "_delete");
        try {
          await adminDeleteUserApi(userId);
          toast.success("User deleted successfully");
          fetchUsers(userPage);
          const statsRes = await adminGetUserStatsApi();
          setUserStats(statsRes.data.data);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete user");
        } finally {
          setUserActionLoading(null);
        }
      },
    });
  };

  if (loading) return <Loader />;

  const counts = { events: pendingEvents.length, registrations: registrations.length };
  const totalPending = counts.events + counts.registrations;
  const setReason = (id, val) => setRejectReason((p) => ({ ...p, [id]: val }));

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel || "Confirm"}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>Admin Dashboard</h1>
          <p>{totalPending > 0 ? `${totalPending} item${totalPending !== 1 ? "s" : ""} need your attention` : "Everything is up to date ✓"}</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
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
        {/* Feedback Moderation tab */}
        {activeTab === "feedback" && (
          <div>
            <div style={{
              background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
              padding: "20px 22px", marginBottom: 24, boxShadow: "var(--shadow-sm)",
              display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", flexShrink: 0 }}>Select event:</span>
              <select value={feedbackEventId} onChange={(e) => { setFeedbackEventId(e.target.value); setFeedbackData(null); }} style={{ flex: 1, minWidth: 240 }}>
                <option value="">— Choose an event —</option>
                {allEvents.map((ev) => (
                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                ))}
              </select>
              <button onClick={handleLoadFeedback} disabled={!feedbackEventId || feedbackLoading} className="btn btn-primary btn-sm">
                {feedbackLoading ? "Loading…" : "Load Reviews"}
              </button>
            </div>

            {feedbackData && (
              feedbackData.reviews.length === 0 ? (
                <EmptyState icon="⭐" title="No reviews" message="No feedback submitted for this event yet." />
              ) : (
                <div>
                  {/* Summary */}
                  {feedbackData.averageRating !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "14px 18px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{feedbackData.averageRating.toFixed(1)}</span>
                      <div>
                        <StarRating value={Math.round(feedbackData.averageRating)} size={16} />
                        <div style={{ fontSize: 12, color: "#6d28d9", marginTop: 3 }}>{feedbackData.totalCount} review{feedbackData.totalCount !== 1 ? "s" : ""} (including hidden)</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {feedbackData.reviews.map((review) => (
                      <div key={review._id} style={{
                        background: "#fff", borderRadius: "var(--radius-lg)",
                        border: `1px solid ${review.status === "hidden" ? "#fecdd3" : "#ddd6fe"}`,
                        borderLeft: `4px solid ${review.status === "hidden" ? "#ef4444" : "#7c3aed"}`,
                        padding: "16px 20px", boxShadow: "var(--shadow-sm)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                              {review.userId?.name || "Anonymous"}
                            </span>
                            <StarRating value={review.rating} size={13} />
                            {review.status === "hidden" && (
                              <span style={{ background: "#fff1f2", color: "#b91c1c", border: "1px solid #fecdd3", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                🚫 Hidden
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {fmtDate(review.createdAt)}
                          </span>
                        </div>
                        {review.review && (
                          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.6 }}>
                            {review.review}
                          </p>
                        )}
                        <div style={{ display: "flex", gap: 8 }}>
                          {review.status !== "hidden" && (
                            <ActionBtn onClick={() => handleHideFeedback(review._id)} variant="danger">
                              🚫 Hide
                            </ActionBtn>
                          )}
                          <ActionBtn onClick={() => handleAdminDeleteFeedback(review._id)} variant="danger">
                            🗑 Delete
                          </ActionBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
        {/* User Management tab */}
        {activeTab === "users" && (
          <div>
            {/* Stats strip */}
            {userStats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Total",      value: userStats.total,      color: "#0f172a", bg: "#f8fafc", border: "#e2e8f0" },
                  { label: "Attendees",  value: userStats.attendees,  color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
                  { label: "Organizers", value: userStats.organizers, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                  { label: "Verified",   value: userStats.verified,   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                  { label: "Unverified", value: userStats.unverified, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} style={{
                    background: "#fff", borderRadius: "var(--radius)", padding: "14px 16px",
                    border: `1px solid ${border}`, borderLeft: `4px solid ${color}`,
                    boxShadow: "var(--shadow-sm)",
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Search + filter bar */}
            <form onSubmit={handleUserSearch} style={{
              background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
              padding: "16px 20px", marginBottom: 20, boxShadow: "var(--shadow-sm)",
              display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
            }}>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 14 }}
              />
              <select
                value={userRoleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 14, background: "#fff" }}
              >
                <option value="">All roles</option>
                <option value="ATTENDEE">Attendee</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
              {(userSearch || userRoleFilter) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                  setUserSearch(""); setUserRoleFilter(""); setUserPage(1); fetchUsers(1, "", "");
                }}>Clear</button>
              )}
            </form>

            {/* Users table */}
            {usersLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading users…</div>
            ) : users.length === 0 ? (
              <EmptyState icon="👥" title="No users found" message="Try a different search or filter." />
            ) : (
              <>
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
                  {/* Table header */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
                    padding: "10px 20px", background: "#f8fafc",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.06em", gap: 12,
                  }}>
                    <span>User</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>

                  {users.map((u, i) => {
                    const ROLE_COLOR = { ATTENDEE: "#0891b2", ORGANIZER: "#7c3aed", ADMIN: "#dc2626" };
                    const ROLE_BG    = { ATTENDEE: "#ecfeff", ORGANIZER: "#f5f3ff", ADMIN: "#fff1f2" };
                    const ROLE_BORDER= { ATTENDEE: "#a5f3fc", ORGANIZER: "#ddd6fe", ADMIN: "#fecdd3" };
                    return (
                      <div key={u._id} style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto",
                        padding: "13px 20px", gap: 12, alignItems: "center",
                        background: "#fff",
                        borderBottom: i < users.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}>
                        {/* Name + joined */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            Joined {fmtDate(u.createdAt)}
                          </div>
                        </div>

                        {/* Email */}
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", wordBreak: "break-all" }}>{u.email}</div>

                        {/* Role badge + change */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <span style={{
                            background: ROLE_BG[u.role], color: ROLE_COLOR[u.role],
                            border: `1px solid ${ROLE_BORDER[u.role]}`,
                            borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                          }}>{u.role}</span>
                          {u.role !== "ADMIN" && (
                            <select
                              value={u.role}
                              disabled={userActionLoading === u._id + "_role"}
                              onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                              style={{
                                fontSize: 11, padding: "2px 6px", borderRadius: 6,
                                border: "1px solid var(--border)", background: "#fff",
                                cursor: "pointer", color: "var(--text-secondary)",
                              }}
                            >
                              <option value="ATTENDEE">Attendee</option>
                              <option value="ORGANIZER">Organizer</option>
                            </select>
                          )}
                        </div>

                        {/* Verified status */}
                        <div>
                          {u.isVerified ? (
                            <span style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                              ✓ Verified
                            </span>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                              <span style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                                ⏳ Unverified
                              </span>
                              <button
                                onClick={() => handleVerifyUser(u._id)}
                                disabled={userActionLoading === u._id + "_verify"}
                                style={{
                                  fontSize: 11, fontWeight: 600, color: "#15803d",
                                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                                  borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                                }}
                              >
                                {userActionLoading === u._id + "_verify" ? "…" : "Verify"}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <div>
                          {u.role !== "ADMIN" && (
                            <ActionBtn
                              onClick={() => handleDeleteUser(u._id, u.name)}
                              variant="danger"
                              disabled={userActionLoading === u._id + "_delete"}
                            >
                              {userActionLoading === u._id + "_delete" ? "…" : "🗑 Delete"}
                            </ActionBtn>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {userPagination && userPagination.totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => handleUserPageChange(userPage - 1)}
                      disabled={userPage === 1}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: userPage === 1 ? "not-allowed" : "pointer", opacity: userPage === 1 ? 0.5 : 1 }}
                    >← Prev</button>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                      Page {userPage} of {userPagination.totalPages} · {userPagination.total} users
                    </span>
                    <button
                      onClick={() => handleUserPageChange(userPage + 1)}
                      disabled={userPage === userPagination.totalPages}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: userPage === userPagination.totalPages ? "not-allowed" : "pointer", opacity: userPage === userPagination.totalPages ? 0.5 : 1 }}
                    >Next →</button>
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
