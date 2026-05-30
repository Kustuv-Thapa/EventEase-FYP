import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMyEventsApi, createEventApi, updateEventApi, deleteEventApi, submitEventForApprovalApi, uploadEventImageApi, updateCapacityApi, cancelEventApi, updateEventGalleryApi } from "../api/eventApi";
import { getVenuesApi, checkVenueAvailabilityApi } from "../api/venueApi";
import { getAdminRegistrationsApi, approveRegistrationApi, adminEventRegistrationsApi } from "../api/registrationApi";
import { getEventFeedbackApi } from "../api/feedbackApi";
import StarRating from "../components/StarRating";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import GalleryUploader from "../components/GalleryUploader";
import EmptyState from "../components/EmptyState";
import ConfirmModal from "../components/ConfirmModal";

const EMPTY_FORM = {
  title: "", description: "", genre: "",
  venueId: "", startDateTime: "", endDateTime: "",
  capacity: "", pricingType: "FREE", price: "", images: [],
};

const STATUS = {
  DRAFT:            { label: "Draft",     color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", dot: "#94a3b8" },
  PENDING_APPROVAL: { label: "Pending",   color: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
  PUBLISHED:        { label: "Live",      color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
  CANCELLED:        { label: "Cancelled", color: "#b91c1c", bg: "#fff1f2", border: "#fecdd3", dot: "#ef4444" },
  COMPLETED:        { label: "Completed", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6" },
};

const Dot = ({ status }) => {
  const s = STATUS[status] || STATUS.DRAFT;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 999, padding: "3px 10px 3px 7px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block", flexShrink: 0 }} />
      {s.label}
    </span>
  );
};

const fmt = (dt) => dt ? new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtTime = (dt) => dt ? new Date(dt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function OrganizerEventManagement() {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [capacityEdit, setCapacityEdit] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const debounceRef = useRef(null);
  const [searchParams] = useSearchParams();
  // Attendee list state
  const [attendeeEventId, setAttendeeEventId] = useState(null);
  const [attendees, setAttendees] = useState(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Feedback panel state
  const [feedbackEventId, setFeedbackEventId] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  const fetchAll = async () => {
    try {
      const [evRes, vRes] = await Promise.all([getMyEventsApi(), getVenuesApi()]);
      setEvents(evRes.data.data?.items || []);
      setVenues(vRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Pre-select venue from URL query param (e.g. from VenueCard "Create Event Here" link)
  useEffect(() => {
    const venueIdParam = searchParams.get("venueId");
    if (venueIdParam && venues.length > 0) {
      const found = venues.find((v) => v._id === venueIdParam);
      if (found) {
        setSelectedVenue(found);
        setForm((p) => ({ ...p, venueId: found._id }));
        setShowForm(true);
      }
    }
  }, [venues, searchParams]);

  const triggerAvailabilityCheck = (venueId, start, end) => {
    clearTimeout(debounceRef.current);
    if (!venueId || !start || !end || start >= end) { setAvailability(null); return; }
    debounceRef.current = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const res = await checkVenueAvailabilityApi(venueId, start, end);
        setAvailability(res.data);
      } catch { setAvailability(null); }
      finally { setCheckingAvailability(false); }
    }, 500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...form, [name]: value };
    setForm(updated);

    if (name === "venueId") {
      const found = venues.find((v) => v._id === value);
      setSelectedVenue(found || null);
      setAvailability(null);
      if (found && updated.startDateTime && updated.endDateTime) {
        triggerAvailabilityCheck(value, updated.startDateTime, updated.endDateTime);
      }
    }

    if (name === "startDateTime" || name === "endDateTime") {
      setAvailability(null);
      if (updated.venueId && updated.startDateTime && updated.endDateTime) {
        triggerAvailabilityCheck(updated.venueId, updated.startDateTime, updated.endDateTime);
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
    setForm(EMPTY_FORM);
    setSelectedVenue(null);
    setAvailability(null);
  };

  const openCreate = () => { closeForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Convert a UTC ISO string to local datetime-local input format (YYYY-MM-DDTHH:mm)
  const toLocalDT = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = (ev) => {
    const matched = venues.find((v) => v.name === ev.venue?.name && v.location?.city === ev.venue?.city);
    setEditingEvent(ev);
    setSelectedVenue(matched || null);
    setAvailability(null);
    setForm({
      title: ev.title || "", description: ev.description || "",
      genre: (ev.genre || []).join(", "),
      venueId: matched?._id || "",
      startDateTime: toLocalDT(ev.schedule?.startDateTime),
      endDateTime: toLocalDT(ev.schedule?.endDateTime),
      capacity: ev.capacity || "",
      pricingType: ev.pricing?.type || "FREE", price: ev.pricing?.price || "",
      images: ev.images?.length > 0 ? ev.images : (ev.image ? [ev.image] : []),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const v = selectedVenue;
    const p = {
      title: form.title, description: form.description,
      genre: form.genre ? form.genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
      venueId: form.venueId,
      schedule: { startDateTime: form.startDateTime, endDateTime: form.endDateTime },
      capacity: Number(form.capacity),
      pricing: { type: form.pricingType, price: form.pricingType === "PAID" ? Number(form.price) : 0 },
    };
    if (v) p.venue = { name: v.name, address: v.location.address, city: v.location.city };
    return p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent && !form.venueId) { toast.error("Please select a venue"); return; }
    if (availability?.hasApprovedConflict) { toast.error("This venue is already booked for that time slot. Please choose different dates."); return; }
    setSubmitting(true);
    try {
      let saved;
      if (editingEvent) { const r = await updateEventApi(editingEvent._id, buildPayload()); saved = r.data.data; }
      else { const r = await createEventApi(buildPayload()); saved = r.data.data; }
      if (form.images?.length > 0) {
        try {
          await updateEventGalleryApi(saved._id, form.images);
        } catch (galleryErr) {
          // Event saved successfully but gallery failed — show warning and still close form
          toast.error("Event saved, but gallery upload failed: " + (galleryErr.response?.data?.message || "Please try re-uploading images."));
          fetchAll();
          closeForm();
          return;
        }
      }
      toast.success(editingEvent ? "Event updated successfully!" : "Event created successfully!");
      closeForm(); fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to save event"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Event",
      message: "Are you sure you want to delete this event? This cannot be undone.",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try { await deleteEventApi(id); toast.success("Event deleted successfully!"); fetchAll(); }
        catch (err) { toast.error(err.response?.data?.message || "Failed to delete event"); }
      },
    });
  };
  const handleSubmitForApproval = async (id) => {
    try { await submitEventForApprovalApi(id); toast.success("Event submitted for approval!"); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to submit for approval"); }
  };
  const handleUpdateCapacity = async (id) => {
    const cap = parseInt(capacityEdit[id], 10);
    if (!cap || cap < 1) { toast.error("Enter a valid capacity"); return; }
    try { await updateCapacityApi(id, cap); setCapacityEdit((p) => ({ ...p, [id]: "" })); toast.success("Capacity updated successfully!"); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to update capacity"); }
  };
  const handleCancelEvent = async (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Event",
      message: "Cancel this event? All registrations and tickets will be cancelled and attendees will be notified.",
      confirmLabel: "Yes, Cancel Event",
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        try { await cancelEventApi(id); toast.success("Event cancelled successfully"); fetchAll(); }
        catch (err) { toast.error(err.response?.data?.message || "Failed to cancel event"); }
      },
    });
  };

  const handleViewAttendees = async (eventId) => {
    if (attendeeEventId === eventId) { setAttendeeEventId(null); setAttendees(null); return; }
    setAttendeeEventId(eventId);
    setAttendeesLoading(true);
    try {
      const res = await adminEventRegistrationsApi(eventId);
      setAttendees(res.data.data);
    } catch (err) {
      setAttendees(null);
      toast.error(err.response?.data?.message || "Failed to load attendees");
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleViewFeedback = async (eventId) => {
    if (feedbackEventId === eventId) { setFeedbackEventId(null); setFeedbackData(null); return; }
    // Close attendees panel if open
    setAttendeeEventId(null);
    setAttendees(null);
    setFeedbackEventId(eventId);
    setFeedbackLoading(true);
    try {
      const res = await getEventFeedbackApi(eventId);
      setFeedbackData(res.data.data);
    } catch (err) {
      setFeedbackData(null);
      toast.error(err.response?.data?.message || "Failed to load feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) return <Loader />;

  const counts = {
    total: events.length,
    PUBLISHED: events.filter(e => e.status === "PUBLISHED").length,
    PENDING_APPROVAL: events.filter(e => e.status === "PENDING_APPROVAL").length,
    DRAFT: events.filter(e => e.status === "DRAFT").length,
    CANCELLED: events.filter(e => e.status === "CANCELLED").length,
    COMPLETED: events.filter(e => e.status === "COMPLETED").length,
  };

  const filtered = filterStatus === "ALL" ? events : events.filter(e => e.status === filterStatus);

  const FILTERS = [
    { key: "ALL",              label: "All",       count: counts.total },
    { key: "PUBLISHED",        label: "Live",      count: counts.PUBLISHED },
    { key: "PENDING_APPROVAL", label: "Pending",   count: counts.PENDING_APPROVAL },
    { key: "DRAFT",            label: "Drafts",    count: counts.DRAFT },
    { key: "CANCELLED",        label: "Cancelled", count: counts.CANCELLED },
    { key: "COMPLETED",        label: "Completed", count: counts.COMPLETED },
  ];

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
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>My Events</h1>
            <p>{counts.total} event{counts.total !== 1 ? "s" : ""} · {counts.PUBLISHED} live · {counts.PENDING_APPROVAL} pending review</p>
          </div>
          <button onClick={showForm ? closeForm : openCreate} className={`btn btn-sm ${showForm ? "btn-ghost" : "btn-secondary"}`}>
            {showForm ? "✕ Discard" : "+ New Event"}
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 28 }}>
        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28,
        }}>
          {[
            { label: "Total", value: counts.total, accent: "#6366f1", bg: "#eef2ff" },
            { label: "Live", value: counts.PUBLISHED, accent: "#16a34a", bg: "#f0fdf4" },
            { label: "Pending", value: counts.PENDING_APPROVAL, accent: "#d97706", bg: "#fffbeb" },
            { label: "Drafts", value: counts.DRAFT, accent: "#64748b", bg: "#f8fafc" },
          ].map(({ label, value, accent, bg }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "var(--radius)", padding: "18px 20px",
              border: "1px solid var(--border)", borderLeft: `4px solid ${accent}`,
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <div style={{
            background: "#fff", border: "1px solid #e0e7ff",
            borderRadius: "var(--radius-lg)", marginBottom: 32,
            boxShadow: "0 4px 24px rgba(99,102,241,0.10)", overflow: "hidden",
          }}>
            <div style={{
              padding: "16px 28px", background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
              borderBottom: "1px solid #e0e7ff", display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{editingEvent ? "✏️" : "🎪"}</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#3730a3", margin: 0 }}>
                  {editingEvent ? `Editing — ${editingEvent.title}` : "Create New Event"}
                </h3>
              </div>
              <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: "2px 6px" }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "24px 28px" }}>
              <div className="form-group">
                <label>Event Title *</label>
                <input name="title" value={form.title} onChange={handleChange} required placeholder="e.g. Jazz Night at the Garden" />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Tell attendees what to expect..." />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div className="form-group">
                  <label>Genre / Tags <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", fontSize: 11 }}>(comma-separated)</span></label>
                  <input name="genre" value={form.genre} onChange={handleChange} placeholder="Music, Jazz, Live" />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Venue {!editingEvent && "*"}</label>
                  {!editingEvent ? (
                    venues.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 4 }}>No active venues available. Contact admin.</p>
                    ) : (
                      <>
                        <select name="venueId" value={form.venueId} onChange={handleChange} required>
                          <option value="">— Select a venue —</option>
                          {venues.filter(v => v.isActive).map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.name} · {v.location?.city} · {v.capacity?.toLocaleString()} seats
                            </option>
                          ))}
                        </select>

                        {/* Venue preview */}
                        {selectedVenue && (
                          <div style={{ marginTop: 12, borderRadius: 10, overflow: "hidden", border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(99,102,241,0.08)", display: "flex" }}>
                            <div style={{ width: 110, flexShrink: 0 }}>
                              {selectedVenue.image
                                ? <img src={selectedVenue.image} alt={selectedVenue.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                : <div style={{ width: "100%", height: "100%", minHeight: 90, background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🏛️</div>
                              }
                            </div>
                            <div style={{ padding: "12px 14px", flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{selectedVenue.name}</div>
                              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>📍 {selectedVenue.location?.address}, {selectedVenue.location?.city}</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>👥 Capacity: <strong>{selectedVenue.capacity?.toLocaleString()}</strong></div>
                            </div>
                          </div>
                        )}

                        {/* Availability indicator */}
                        {form.venueId && form.startDateTime && form.endDateTime && form.startDateTime < form.endDateTime && (
                          <div style={{ marginTop: 10 }}>
                            {checkingAvailability && (
                              <div style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid #6366f1", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                                Checking availability…
                              </div>
                            )}
                            {!checkingAvailability && availability?.hasApprovedConflict && (
                              <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
                                🚫 This venue is already booked for that time slot. Please choose different dates.
                              </div>
                            )}
                            {!checkingAvailability && !availability?.hasApprovedConflict && availability?.hasPendingConflict && (
                              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                                ⚠ Another booking request exists for an overlapping slot. You can still submit — the admin will decide.
                              </div>
                            )}
                            {!checkingAvailability && availability?.available && !availability?.hasPendingConflict && (
                              <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                ✅ This time slot is available
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      📍 {editingEvent.venue?.name}, {editingEvent.venue?.city}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="startDateTime"
                    value={form.startDateTime}
                    onChange={handleChange}
                    min={editingEvent ? undefined : new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="endDateTime"
                    value={form.endDateTime}
                    onChange={handleChange}
                    min={form.startDateTime
                      ? new Date(new Date(form.startDateTime).getTime() + 30 * 60000).toISOString().slice(0, 16)
                      : new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
                <div className="form-group">
                  <label>Capacity *</label>
                  <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required min={1} placeholder="Max attendees" />
                </div>
                <div className="form-group">
                  <label>Pricing</label>
                  <select name="pricingType" value={form.pricingType} onChange={handleChange}>
                    <option value="FREE">Free</option>
                    <option value="PAID">Paid</option>
                  </select>
                </div>
                {form.pricingType === "PAID" && (
                  <div className="form-group">
                    <label>Price (NPR) *</label>
                    <input type="number" name="price" value={form.price} onChange={handleChange} required min={1} placeholder="0" />
                  </div>
                )}
              </div>

              <GalleryUploader
                images={form.images || []}
                onChange={(imgs) => setForm((p) => ({ ...p, images: imgs }))}
              />

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e0e7ff", display: "flex", gap: 10 }}>
                <button type="submit" className={`btn btn-primary${submitting ? " btn-loading" : ""}`} disabled={submitting || checkingAvailability || availability?.hasApprovedConflict}>
                  {submitting ? "Saving…" : editingEvent ? "Save Changes" : "Create Event"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Filter pills */}
        {events.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {FILTERS.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  border: filterStatus === key ? "1.5px solid #6366f1" : "1.5px solid var(--border)",
                  background: filterStatus === key ? "#eef2ff" : "#fff",
                  color: filterStatus === key ? "#4338ca" : "var(--text-secondary)",
                }}
              >
                {label} <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Events grid */}
        {filtered.length === 0 ? (
          <EmptyState icon="🎪" title={filterStatus === "ALL" ? "No events yet" : `No ${filterStatus.toLowerCase()} events`} message="Create your first event to get started." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {filtered.map((ev) => {
              const s = STATUS[ev.status] || STATUS.DRAFT;
              const remaining = ev.capacity != null ? ev.capacity - (ev.confirmedCount ?? ev.registeredCount ?? 0) : null;
              return (
                <div key={ev._id} style={{
                  background: "#fff", borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
                  overflow: "hidden", display: "flex", flexDirection: "column",
                  transition: "box-shadow 0.2s, transform 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}
                >
                  {/* Cover */}
                  <div style={{ position: "relative", height: 160, overflow: "hidden", flexShrink: 0 }}>
                    {ev.image ? (
                      <img src={ev.image} alt={ev.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: `linear-gradient(135deg, ${["#eef2ff,#f5f3ff","#fef3c7,#fde68a","#dcfce7,#bbf7d0","#fce7f3,#fbcfe8"][parseInt(ev._id?.slice(-1), 16) % 4]})`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48,
                      }}>🎪</div>
                    )}
                    {/* Status badge overlay */}
                    <div style={{ position: "absolute", top: 10, left: 10 }}>
                      <Dot status={ev.status} />
                    </div>
                    {/* Pricing badge */}
                    <div style={{ position: "absolute", top: 10, right: 10 }}>
                      <span style={{
                        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(4px)",
                        color: ev.pricing?.type === "FREE" ? "#16a34a" : "#4338ca",
                        border: `1px solid ${ev.pricing?.type === "FREE" ? "#bbf7d0" : "#c7d2fe"}`,
                        borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                      }}>
                        {ev.pricing?.type === "FREE" ? "Free" : `NPR ${ev.pricing?.price?.toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>
                        {(ev.status === "PUBLISHED" || ev.status === "COMPLETED") ? (
                          <Link
                            to={ev.status === "COMPLETED" ? `/events/${ev._id}#feedback` : `/events/${ev._id}`}
                            style={{ color: "inherit", textDecoration: "none" }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                            title={ev.status === "COMPLETED" ? "View event & manage feedback" : "View event page"}
                          >
                            {ev.title} ↗
                          </Link>
                        ) : (
                          ev.title
                        )}
                      </h3>
                      {ev.description && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                          {ev.description.slice(0, 80)}{ev.description.length > 80 ? "…" : ""}
                        </p>
                      )}
                      {ev.status === "DRAFT" && ev.rejectionReason && (
                        <div style={{ marginTop: 8, padding: "8px 12px", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
                          ⚠️ Rejected: {ev.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)" }}>
                        <span>📅</span>
                        <span>{fmtTime(ev.schedule?.startDateTime)}</span>
                      </div>
                      {ev.venue?.name && (
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)" }}>
                          <span>📍</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.venue.name}{ev.venue.city ? `, ${ev.venue.city}` : ""}</span>
                        </div>
                      )}
                      {remaining !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: remaining <= 0 ? "#dc2626" : remaining <= 10 ? "#d97706" : "#16a34a" }}>
                          <span>👥</span>
                          <span>{remaining <= 0 ? "Sold out" : `${remaining} / ${ev.capacity} seats left`}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capacity update for published */}
                  {ev.status === "PUBLISHED" && (
                    <div style={{ padding: "10px 18px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600, flexShrink: 0 }}>Update seats:</span>
                      <input
                        type="number" min={1} placeholder="New capacity"
                        value={capacityEdit[ev._id] || ""}
                        onChange={(e) => setCapacityEdit((p) => ({ ...p, [ev._id]: e.target.value }))}
                        style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #bbf7d0", fontSize: 12, background: "#fff", color: "var(--text)", minWidth: 0 }}
                      />
                      <button onClick={() => handleUpdateCapacity(ev._id)}
                        style={{ padding: "5px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        Save
                      </button>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "#fafafa", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {ev.status === "COMPLETED" ? (
                      <>
                        <span style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 600, flex: 1 }}>✅ Completed</span>
                        <button onClick={() => handleViewAttendees(ev._id)} className="btn btn-sm"
                          style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                          👥 Attendees
                        </button>
                        <button onClick={() => handleViewFeedback(ev._id)} className="btn btn-sm"
                          style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                          ⭐ Reviews
                        </button>
                      </>
                    ) : (
                      <>
                        {new Date(ev.schedule?.endDateTime) > new Date() && (
                          <button onClick={() => openEdit(ev)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>✏️ Edit</button>
                        )}
                        {ev.status === "DRAFT" && (
                          <button onClick={() => handleSubmitForApproval(ev._id)} className="btn btn-sm"
                            style={{ flex: 1, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}>
                            🚀 Submit
                          </button>
                        )}
                        {ev.status === "PUBLISHED" && (
                          <>
                            <button onClick={() => handleViewAttendees(ev._id)} className="btn btn-sm"
                              style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
                              👥 Attendees
                            </button>
                            <button onClick={() => handleCancelEvent(ev._id)} className="btn btn-sm"
                              style={{ flex: 1, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                              🚫 Cancel
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(ev._id)} className="btn btn-sm btn-danger" title="Delete">🗑</button>
                      </>
                    )}
                  </div>

                  {/* Attendee panel */}
                  {attendeeEventId === ev._id && (
                    <div style={{ borderTop: "1px solid #bfdbfe", background: "#eff6ff", padding: "16px 18px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1d4ed8", marginBottom: 12 }}>
                        👥 Attendees — {ev.title}
                      </div>
                      {attendeesLoading ? (
                        <div style={{ fontSize: 13, color: "#64748b" }}>Loading…</div>
                      ) : !attendees || attendees.registrations.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#64748b" }}>No confirmed attendees yet.</div>
                      ) : (
                        <>
                          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "#1d4ed8", fontWeight: 600 }}>
                            <span>✅ Confirmed: {attendees.stats.totalConfirmed}</span>
                            <span>🎫 Checked in: {attendees.stats.totalCheckedIn}</span>
                            <span>⏳ Remaining: {attendees.stats.remaining}</span>
                          </div>
                          <div style={{ border: "1px solid #bfdbfe", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", padding: "8px 14px", background: "#dbeafe", fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em", gap: 12 }}>
                              <span>Name</span><span>Email</span><span>Status</span>
                            </div>
                            {attendees.registrations.filter(r => r.status === "confirmed").map((reg, i) => (
                              <div key={reg._id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", padding: "9px 14px", gap: 12, alignItems: "center", borderTop: i > 0 ? "1px solid #eff6ff" : "none" }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{reg.userId?.name}</span>
                                <span style={{ fontSize: 12, color: "#64748b" }}>{reg.userId?.email}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: reg.ticketStatus === "USED" ? "#16a34a" : "#1d4ed8" }}>
                                  {reg.ticketStatus === "USED" ? "✓ In" : "🎫 Valid"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Feedback panel */}
                  {feedbackEventId === ev._id && (
                    <div style={{ borderTop: "1px solid #fde68a", background: "#fffbeb", padding: "16px 18px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#b45309", marginBottom: 12 }}>
                        ⭐ Reviews — {ev.title}
                      </div>
                      {feedbackLoading ? (
                        <div style={{ fontSize: 13, color: "#64748b" }}>Loading…</div>
                      ) : !feedbackData || feedbackData.reviews.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#64748b" }}>No reviews yet.</div>
                      ) : (
                        <>
                          {/* Summary */}
                          {feedbackData.averageRating !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 14px", background: "#fff", border: "1px solid #fde68a", borderRadius: 8 }}>
                              <div style={{ fontSize: 28, fontWeight: 900, color: "#b45309" }}>
                                {feedbackData.averageRating.toFixed(1)}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <StarRating value={Math.round(feedbackData.averageRating)} size={16} />
                                <span style={{ fontSize: 12, color: "#78716c" }}>
                                  {feedbackData.totalCount} {feedbackData.totalCount === 1 ? "review" : "reviews"}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Reviews list */}
                          <div style={{ border: "1px solid #fde68a", borderRadius: 8, overflow: "hidden", background: "#fff", maxHeight: 320, overflowY: "auto" }}>
                            {feedbackData.reviews.map((review, i) => (
                              <div key={review._id} style={{ padding: "12px 14px", borderTop: i > 0 ? "1px solid #fef3c7" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                                    {review.userId?.name || "Anonymous"}
                                  </span>
                                  <StarRating value={review.rating} size={12} />
                                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                                    {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </span>
                                </div>
                                {review.review && (
                                  <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
                                    {review.review}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
