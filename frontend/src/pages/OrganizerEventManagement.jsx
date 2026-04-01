import { useEffect, useState } from "react";
import { getMyEventsApi, createEventApi, updateEventApi, deleteEventApi, submitEventForApprovalApi, uploadEventImageApi, updateCapacityApi, cancelEventApi } from "../api/eventApi";
import { getVenuesApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import ImageUploader from "../components/ImageUploader";
import EmptyState from "../components/EmptyState";

const EMPTY_FORM = {
  title: "", description: "", genre: "",
  venueId: "", startDateTime: "", endDateTime: "",
  capacity: "", pricingType: "FREE", price: "", image: "",
};

const STATUS = {
  DRAFT:            { label: "Draft",    color: "#64748b", bg: "#f1f5f9", border: "#e2e8f0", dot: "#94a3b8" },
  PENDING_APPROVAL: { label: "Pending",  color: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
  PUBLISHED:        { label: "Live",     color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
  CANCELLED:        { label: "Cancelled",color: "#b91c1c", bg: "#fff1f2", border: "#fecdd3", dot: "#ef4444" },
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
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [capacityEdit, setCapacityEdit] = useState({});
  const [filterStatus, setFilterStatus] = useState("ALL");

  const fetchAll = async () => {
    try {
      const [evRes, vRes] = await Promise.all([getMyEventsApi(), getVenuesApi()]);
      setEvents(evRes.data.data?.items || []);
      setVenues((vRes.data.data || []).filter((v) => v.isActive));
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const closeForm = () => { setShowForm(false); setEditingEvent(null); setForm(EMPTY_FORM); };

  const openCreate = () => { closeForm(); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const openEdit = (ev) => {
    const matched = venues.find((v) => v.name === ev.venue?.name && v.location?.city === ev.venue?.city);
    setEditingEvent(ev);
    setForm({
      title: ev.title || "", description: ev.description || "",
      genre: (ev.genre || []).join(", "), venueId: matched?._id || "",
      startDateTime: ev.schedule?.startDateTime ? ev.schedule.startDateTime.slice(0, 16) : "",
      endDateTime: ev.schedule?.endDateTime ? ev.schedule.endDateTime.slice(0, 16) : "",
      capacity: ev.capacity || "",
      pricingType: ev.pricing?.type || "FREE", price: ev.pricing?.price || "",
      image: ev.image || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const v = venues.find((v) => v._id === form.venueId);
    const p = {
      title: form.title, description: form.description,
      genre: form.genre ? form.genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
      schedule: { startDateTime: form.startDateTime, endDateTime: form.endDateTime },
      capacity: Number(form.capacity),
      pricing: { type: form.pricingType, price: form.pricingType === "PAID" ? Number(form.price) : 0 },
    };
    if (v) p.venue = { name: v.name, address: v.location.address, city: v.location.city };
    return p;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent && !form.venueId) { setError("Please select a venue"); return; }
    setError(""); setSubmitting(true);
    try {
      let saved;
      if (editingEvent) { const r = await updateEventApi(editingEvent._id, buildPayload()); saved = r.data.data; }
      else { const r = await createEventApi(buildPayload()); saved = r.data.data; }
      if (form.image?.startsWith("data:image/")) await uploadEventImageApi(saved._id, form.image);
      closeForm(); fetchAll();
    } catch (err) { setError(err.response?.data?.message || "Failed to save event"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { await deleteEventApi(id); fetchAll(); } catch { setError("Failed to delete"); }
  };
  const handleSubmitForApproval = async (id) => {
    try { setError(""); await submitEventForApprovalApi(id); fetchAll(); }
    catch (err) { setError(err.response?.data?.message || "Failed"); }
  };
  const handleUpdateCapacity = async (id) => {
    const cap = parseInt(capacityEdit[id], 10);
    if (!cap || cap < 1) { setError("Enter a valid capacity"); return; }
    try { setError(""); await updateCapacityApi(id, cap); setCapacityEdit((p) => ({ ...p, [id]: "" })); fetchAll(); }
    catch (err) { setError(err.response?.data?.message || "Failed"); }
  };
  const handleCancelEvent = async (id) => {
    if (!window.confirm("Cancel this event? All registrations and tickets will be cancelled.")) return;
    try { setError(""); await cancelEventApi(id); fetchAll(); }
    catch (err) { setError(err.response?.data?.message || "Failed"); }
  };

  if (loading) return <Loader />;

  const counts = {
    total: events.length,
    PUBLISHED: events.filter(e => e.status === "PUBLISHED").length,
    PENDING_APPROVAL: events.filter(e => e.status === "PENDING_APPROVAL").length,
    DRAFT: events.filter(e => e.status === "DRAFT").length,
    CANCELLED: events.filter(e => e.status === "CANCELLED").length,
  };

  const filtered = filterStatus === "ALL" ? events : events.filter(e => e.status === filterStatus);

  const FILTERS = [
    { key: "ALL", label: "All", count: counts.total },
    { key: "PUBLISHED", label: "Live", count: counts.PUBLISHED },
    { key: "PENDING_APPROVAL", label: "Pending", count: counts.PENDING_APPROVAL },
    { key: "DRAFT", label: "Drafts", count: counts.DRAFT },
    { key: "CANCELLED", label: "Cancelled", count: counts.CANCELLED },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
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
        <ErrorMessage message={error} />

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
                <div className="form-group">
                  <label>Venue {!editingEvent && "*"}</label>
                  {venues.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 4 }}>No active venues. Contact admin.</p>
                  ) : (
                    <select name="venueId" value={form.venueId} onChange={handleChange} required={!editingEvent}>
                      <option value="">— Select a venue —</option>
                      {venues.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name} · {v.location?.city} · {v.capacity?.toLocaleString()} seats
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <div className="form-group">
                  <label>Start Date & Time *</label>
                  <input type="datetime-local" name="startDateTime" value={form.startDateTime} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>End Date & Time *</label>
                  <input type="datetime-local" name="endDateTime" value={form.endDateTime} onChange={handleChange} required />
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

              <ImageUploader label="Cover Image" currentImage={form.image} onImageSelect={(img) => setForm((p) => ({ ...p, image: img }))} />

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e0e7ff", display: "flex", gap: 10 }}>
                <button type="submit" className={`btn btn-primary${submitting ? " btn-loading" : ""}`} disabled={submitting}>
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
              const remaining = ev.capacity != null ? ev.capacity - (ev.registeredCount ?? 0) : null;
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
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: 0, lineHeight: 1.3 }}>{ev.title}</h3>
                      {ev.description && (
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                          {ev.description.slice(0, 80)}{ev.description.length > 80 ? "…" : ""}
                        </p>
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
                  <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "#fafafa", display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => openEdit(ev)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>✏️ Edit</button>
                    {ev.status === "DRAFT" && (
                      <button onClick={() => handleSubmitForApproval(ev._id)} className="btn btn-sm"
                        style={{ flex: 1, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}>
                        🚀 Submit
                      </button>
                    )}
                    {ev.status === "PUBLISHED" && (
                      <button onClick={() => handleCancelEvent(ev._id)} className="btn btn-sm"
                        style={{ flex: 1, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                        🚫 Cancel
                      </button>
                    )}
                    <button onClick={() => handleDelete(ev._id)} className="btn btn-sm btn-danger" title="Delete">🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
