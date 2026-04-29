import { useEffect, useState } from "react";
import { getAdminVenuesApi, createVenueApi, updateVenueApi, deleteVenueApi, uploadVenueImageApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import ImageUploader from "../components/ImageUploader";
import EmptyState from "../components/EmptyState";

const EMPTY_FORM = { name: "", capacity: "", address: "", city: "", country: "", amenities: "", image: "" };

const VenueForm = ({ form, onChange, onSubmit, onCancel, submitting, title }) => (
  <div style={{
    background: "#fff", border: "1px solid #e0e7ff", borderRadius: "var(--radius-lg)",
    marginBottom: 28, boxShadow: "0 4px 24px rgba(99,102,241,0.10)", overflow: "hidden",
  }}>
    <div style={{
      padding: "16px 28px", background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
      borderBottom: "1px solid #e0e7ff", display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🏛️</span>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#3730a3", margin: 0 }}>{title}</h3>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: "2px 6px" }}>✕</button>
    </div>
    <form onSubmit={onSubmit} style={{ padding: "24px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label>Venue Name *</label>
          <input name="name" value={form.name} onChange={onChange} required placeholder="e.g. City Convention Hall" />
        </div>
        <div className="form-group">
          <label>Capacity *</label>
          <input type="number" name="capacity" value={form.capacity} onChange={onChange} required min={1} placeholder="Max attendees" />
        </div>
        <div className="form-group">
          <label>City *</label>
          <input name="city" value={form.city} onChange={onChange} required placeholder="Kathmandu" />
        </div>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label>Address *</label>
          <input name="address" value={form.address} onChange={onChange} required placeholder="Full street address" />
        </div>
        <div className="form-group">
          <label>Country *</label>
          <input name="country" value={form.country} onChange={onChange} required placeholder="Nepal" />
        </div>
        <div className="form-group">
          <label>Amenities <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", fontSize: 11 }}>(comma-separated)</span></label>
          <input name="amenities" value={form.amenities} onChange={onChange} placeholder="Parking, WiFi, Stage" />
        </div>
      </div>
      <ImageUploader label="Venue Image" currentImage={form.image} onImageSelect={(img) => onChange({ target: { name: "image", value: img } })} />
      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e0e7ff", display: "flex", gap: 10 }}>
        <button type="submit" className={`btn btn-primary${submitting ? " btn-loading" : ""}`} disabled={submitting}>
          {submitting ? "Saving…" : title.startsWith("Edit") ? "Save Changes" : "Create Venue"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  </div>
);

export default function AdminVenueManagement() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [filterActive, setFilterActive] = useState("ALL");

  const fetchVenues = async () => {
    try { const res = await getAdminVenuesApi(); setVenues(res.data.data || []); }
    catch { setError("Failed to load venues"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const closeForm = () => { setShowForm(false); setEditingVenue(null); setForm(EMPTY_FORM); };

  const handleCreate = async (e) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const res = await createVenueApi({
        name: form.name, capacity: Number(form.capacity),
        location: { address: form.address, city: form.city, country: form.country },
        amenities: form.amenities ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
      });
      if (form.image?.startsWith("data:image/")) await uploadVenueImageApi(res.data.data._id, form.image);
      closeForm(); fetchVenues();
    } catch (err) { setError(err.response?.data?.message || "Failed to create venue"); }
    finally { setSubmitting(false); }
  };

  const handleEditClick = (v) => {
    setEditingVenue(v._id);
    setForm({ name: v.name || "", capacity: v.capacity || "", address: v.location?.address || "", city: v.location?.city || "", country: v.location?.country || "", amenities: v.amenities?.join(", ") || "", image: "" });
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      await updateVenueApi(editingVenue, {
        name: form.name, capacity: Number(form.capacity),
        location: { address: form.address, city: form.city, country: form.country },
        amenities: form.amenities ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
      });
      if (form.image?.startsWith("data:image/")) await uploadVenueImageApi(editingVenue, form.image);
      closeForm(); fetchVenues();
    } catch (err) { setError(err.response?.data?.message || "Failed to update venue"); }
    finally { setSubmitting(false); }
  };

  const handleVenueImageUpdate = async (venueId, image) => {
    try { setError(""); await uploadVenueImageApi(venueId, image); fetchVenues(); }
    catch (err) { setError(err.response?.data?.message || "Failed to update image"); }
    finally { setUploadingImageFor(null); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this venue?")) return;
    try { await deleteVenueApi(id); fetchVenues(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete venue"); }
  };

  if (loading) return <Loader />;

  const active = venues.filter((v) => v.isActive).length;
  const inactive = venues.length - active;

  const filtered = filterActive === "ALL" ? venues
    : filterActive === "ACTIVE" ? venues.filter(v => v.isActive)
    : venues.filter(v => !v.isActive);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Banner */}
      <div className="page-banner">
        <div className="page-banner-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1>Venue Management</h1>
            <p>{venues.length} venue{venues.length !== 1 ? "s" : ""} · {active} active · {inactive} inactive</p>
          </div>
          <button
            onClick={() => { if (showForm || editingVenue) { closeForm(); } else { setShowForm(true); } }}
            className={`btn btn-sm ${(showForm || editingVenue) ? "btn-ghost" : "btn-secondary"}`}
          >
            {(showForm || editingVenue) ? "✕ Discard" : "+ Add Venue"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Venues", value: venues.length, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
            { label: "Active",       value: active,         color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Inactive",     value: inactive,       color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "var(--radius-lg)", padding: "22px 24px",
              border: `1px solid ${border}`, borderLeft: `4px solid ${color}`,
              boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                🏛️
              </div>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {showForm && (
          <VenueForm form={form} onChange={handleChange} onSubmit={handleCreate} onCancel={closeForm} submitting={submitting} title="Add New Venue" />
        )}

        {/* Edit form */}
        {editingVenue && (
          <VenueForm form={form} onChange={handleChange} onSubmit={handleUpdate} onCancel={closeForm} submitting={submitting} title="Edit Venue" />
        )}

        {/* Filter pills */}
        {venues.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { key: "ALL",      label: "All",      count: venues.length },
              { key: "ACTIVE",   label: "Active",   count: active },
              { key: "INACTIVE", label: "Inactive", count: inactive },
            ].map(({ key, label, count }) => (
              <button key={key} onClick={() => setFilterActive(key)} style={{
                padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.15s",
                border: filterActive === key ? "1.5px solid #6366f1" : "1.5px solid var(--border)",
                background: filterActive === key ? "#eef2ff" : "#fff",
                color: filterActive === key ? "#4338ca" : "var(--text-secondary)",
              }}>
                {label} <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Venues grid */}
        {filtered.length === 0 ? (
          <EmptyState icon="🏛️" title="No venues" message="Add your first venue to get started." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {filtered.map((v) => (
              <div key={v._id} style={{
                background: "#fff", borderRadius: "var(--radius-lg)",
                border: `1px solid ${v.isActive ? "#bbf7d0" : "#e2e8f0"}`,
                borderTop: `3px solid ${v.isActive ? "#22c55e" : "#94a3b8"}`,
                boxShadow: "var(--shadow-sm)", overflow: "hidden", display: "flex", flexDirection: "column",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Cover image */}
                <div style={{ height: 150, overflow: "hidden", flexShrink: 0, position: "relative" }}>
                  {v.image ? (
                    <img src={v.image} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🏛️</div>
                  )}
                  <div style={{ position: "absolute", top: 10, right: 10 }}>
                    <span style={{
                      background: v.isActive ? "rgba(240,253,244,0.92)" : "rgba(248,250,252,0.92)",
                      color: v.isActive ? "#15803d" : "#64748b",
                      border: `1px solid ${v.isActive ? "#bbf7d0" : "#e2e8f0"}`,
                      borderRadius: 999, padding: "3px 10px 3px 7px", fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 5,
                      backdropFilter: "blur(4px)",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.isActive ? "#22c55e" : "#94a3b8", display: "inline-block" }} />
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "16px 18px", flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: "0 0 10px" }}>{v.name}</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 7, alignItems: "center" }}>
                      <span>📍</span><span>{v.location?.address}, {v.location?.city}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 7, alignItems: "center" }}>
                      <span>👥</span><span>{v.capacity?.toLocaleString()} capacity</span>
                    </div>
                    {v.amenities?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                        {v.amenities.slice(0, 4).map((a, i) => (
                          <span key={i} style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{a}</span>
                        ))}
                        {v.amenities.length > 4 && (
                          <span style={{ background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>+{v.amenities.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Image uploader strip */}
                {uploadingImageFor === v._id && (
                  <div style={{ padding: "12px 18px", borderTop: "1px solid #e0e7ff", background: "#f8faff" }}>
                    <ImageUploader label="" currentImage={v.image || ""} onImageSelect={(img) => img && handleVenueImageUpdate(v._id, img)} />
                  </div>
                )}

                {/* Actions */}
                <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border)", background: "#fafafa", display: "flex", gap: 8 }}>
                  <button onClick={() => handleEditClick(v)} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>✏️ Edit</button>
                  <button
                    onClick={() => setUploadingImageFor(uploadingImageFor === v._id ? null : v._id)}
                    className="btn btn-sm"
                    style={{ flex: 1, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}
                  >
                    🖼️ {uploadingImageFor === v._id ? "Close" : "Image"}
                  </button>
                  <button onClick={() => handleDelete(v._id)} className="btn btn-sm btn-danger" title="Delete">🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
