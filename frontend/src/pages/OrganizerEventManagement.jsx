import { useEffect, useState } from "react";
import { getMyEventsApi, createEventApi, updateEventApi, deleteEventApi, submitEventForApprovalApi, uploadEventImageApi } from "../api/eventApi";
import { getVenuesApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import ImageUploader from "../components/ImageUploader";

const EMPTY_FORM = {
  title: "", description: "", genre: "",
  venueId: "", startDateTime: "", endDateTime: "",
  pricingType: "FREE", price: "", image: "",
};

const STATUS_CONFIG = {
  DRAFT:            { label: "Draft",            color: "#64748b", bg: "#f1f5f9", border: "#94a3b8" },
  PENDING_APPROVAL: { label: "Pending Approval", color: "#92400e", bg: "#fef3c7", border: "#f59e0b" },
  PUBLISHED:        { label: "Published",        color: "#166534", bg: "#dcfce7", border: "#22c55e" },
  CANCELLED:        { label: "Cancelled",        color: "#991b1b", bg: "#fee2e2", border: "#ef4444" },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
};

const OrganizerEventManagement = () => {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const [evRes, vRes] = await Promise.all([getMyEventsApi(), getVenuesApi()]);
      setEvents(evRes.data.data?.items || []);
      setVenues((vRes.data.data || []).filter((v) => v.isActive));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const openCreate = () => { setEditingEvent(null); setForm(EMPTY_FORM); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const openEdit = (event) => {
    setEditingEvent(event);
    const matched = venues.find((v) => v.name === event.venue?.name && v.location?.city === event.venue?.city);
    setForm({
      title: event.title || "", description: event.description || "",
      genre: (event.genre || []).join(", "), venueId: matched?._id || "",
      startDateTime: event.schedule?.startDateTime ? event.schedule.startDateTime.slice(0, 16) : "",
      endDateTime: event.schedule?.endDateTime ? event.schedule.endDateTime.slice(0, 16) : "",
      pricingType: event.pricing?.type || "FREE", price: event.pricing?.price || "",
      image: event.image || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = () => {
    const selectedVenue = venues.find((v) => v._id === form.venueId);
    const payload = {
      title: form.title, description: form.description,
      genre: form.genre ? form.genre.split(",").map((g) => g.trim()).filter(Boolean) : [],
      schedule: { startDateTime: form.startDateTime, endDateTime: form.endDateTime },
      pricing: { type: form.pricingType, price: form.pricingType === "PAID" ? Number(form.price) : 0 },
    };
    if (selectedVenue) payload.venue = { name: selectedVenue.name, address: selectedVenue.location.address, city: selectedVenue.location.city };
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent && !form.venueId) { setError("Please select a venue"); return; }
    setError(""); setSubmitting(true);
    try {
      let savedEvent;
      if (editingEvent) {
        const res = await updateEventApi(editingEvent._id, buildPayload());
        savedEvent = res.data.data;
      } else {
        const res = await createEventApi(buildPayload());
        savedEvent = res.data.data;
      }
      // Upload image separately if provided
      if (form.image && form.image.startsWith("data:image/")) {
        await uploadEventImageApi(savedEvent._id, form.image);
      }
      setForm(EMPTY_FORM); setShowForm(false); setEditingEvent(null); fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save event");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { await deleteEventApi(id); fetchAll(); }
    catch { setError("Failed to delete event"); }
  };

  const handleSubmitForApproval = async (id) => {
    try { setError(""); await submitEventForApprovalApi(id); fetchAll(); }
    catch (err) { setError(err.response?.data?.message || "Failed to submit for approval"); }
  };

  if (loading) return <Loader />;

  const counts = { total: events.length, draft: events.filter(e => e.status === "DRAFT").length, published: events.filter(e => e.status === "PUBLISHED").length, pending: events.filter(e => e.status === "PENDING_APPROVAL").length };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>My Events</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{counts.total} total · {counts.published} published · {counts.draft} draft · {counts.pending} pending</p>
        </div>
        <button className="btn-primary" style={{ padding: "10px 20px", fontWeight: 700 }}
          onClick={showForm ? () => { setShowForm(false); setEditingEvent(null); } : openCreate}>
          {showForm ? "✕ Cancel" : "+ Create Event"}
        </button>
      </div>

      <ErrorMessage message={error} />

      {/* Form */}
      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28, marginBottom: 32, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ width: 4, height: 24, background: "var(--primary)", borderRadius: 4 }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>
              {editingEvent ? `Editing: ${editingEvent.title}` : "Create New Event"}
            </h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Title *</label>
                <input name="title" value={form.title} onChange={handleChange} required placeholder="Event title" />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe your event..." />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Genre / Tags <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none" }}>(comma-separated)</span></label>
                <input name="genre" value={form.genre} onChange={handleChange} placeholder="Music, Jazz, Live" />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Venue {!editingEvent && "*"}</label>
                {venues.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--danger)", marginTop: 4 }}>No active venues available. Contact admin.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 6 }}>
                    {venues.map((v) => {
                      const selected = form.venueId === v._id;
                      return (
                        <div
                          key={v._id}
                          onClick={() => setForm((p) => ({ ...p, venueId: v._id }))}
                          style={{
                            borderRadius: 10, overflow: "hidden", cursor: "pointer",
                            border: selected ? "2px solid var(--primary)" : "2px solid var(--border)",
                            boxShadow: selected ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
                            background: "var(--surface)", transition: "all 0.15s",
                          }}
                        >
                          {v.image
                            ? <img src={v.image} alt={v.name} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                            : <div style={{ width: "100%", height: 100, background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏛️</div>
                          }
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {v.location?.city}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>👥 {v.capacity?.toLocaleString()}</div>
                          </div>
                          {selected && (
                            <div style={{ background: "var(--primary)", color: "#fff", textAlign: "center", fontSize: 11, fontWeight: 700, padding: "4px 0" }}>✓ Selected</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!form.venueId && !editingEvent && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>Click a venue to select it.</p>
                )}
              </div>
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input type="datetime-local" name="startDateTime" value={form.startDateTime} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>End Date & Time *</label>
                <input type="datetime-local" name="endDateTime" value={form.endDateTime} onChange={handleChange} required />
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
                  <label>Price *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} required min={1} placeholder="0.00" />
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <ImageUploader
                  label="Event Image"
                  currentImage={form.image}
                  onImageSelect={(img) => setForm((p) => ({ ...p, image: img }))}
                />
              </div>
            </div>
            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: "10px 24px", fontWeight: 700 }}>
                {submitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingEvent(null); }} style={{ padding: "10px 20px" }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Events grid */}
      {events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎪</div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No events yet</p>
          <p style={{ fontSize: 14 }}>Create your first event to get started.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {events.map((event) => {
            const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.DRAFT;
            return (
              <div key={event._id} style={{
                background: "var(--surface)", borderRadius: "var(--radius)",
                border: "1px solid var(--border)", boxShadow: "var(--shadow)",
                overflow: "hidden", display: "flex", flexDirection: "column",
                borderLeft: `4px solid ${cfg.border}`,
              }}>
                {event.image && (
                  <img src={event.image} alt={event.title} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                )}
                <div style={{ padding: "18px 20px", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, flex: 1 }}>{event.title}</h3>
                    <StatusBadge status={event.status} />
                  </div>
                  {event.description && (
                    <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
                      {event.description.slice(0, 80)}{event.description.length > 80 ? "…" : ""}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7 }}>
                      <span>📅</span>{new Date(event.schedule?.startDateTime).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7 }}>
                      <span>📍</span>{event.venue?.name}, {event.venue?.city}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7 }}>
                      <span>🎟</span>{event.pricing?.type === "FREE" ? "Free" : `NPR ${event.pricing?.price?.toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "#fafbfc", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => openEdit(event)} style={{ fontSize: 12, padding: "7px 14px", background: "var(--border)", color: "var(--text)", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                    ✏️ Edit
                  </button>
                  {event.status === "DRAFT" && (
                    <button onClick={() => handleSubmitForApproval(event._id)} style={{ fontSize: 12, padding: "7px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                      🚀 Submit
                    </button>
                  )}
                  <button className="btn-danger" onClick={() => handleDelete(event._id)} style={{ fontSize: 12, padding: "7px 14px", marginLeft: "auto" }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrganizerEventManagement;
