import { useEffect, useState } from "react";
import { getVenuesApi, createVenueApi, deleteVenueApi, uploadVenueImageApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";
import ImageUploader from "../components/ImageUploader";

const EMPTY_FORM = { name: "", capacity: "", address: "", city: "", country: "", amenities: "", image: "" };

const AdminVenueManagement = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState(null); // venueId being updated

  const fetchVenues = async () => {
    try {
      const res = await getVenuesApi();
      setVenues(res.data.data || []);
    } catch {
      setError("Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await createVenueApi({
        name: form.name,
        capacity: Number(form.capacity),
        location: { address: form.address, city: form.city, country: form.country },
        amenities: form.amenities ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean) : [],
      });
      // Upload image if provided
      if (form.image && form.image.startsWith("data:image/")) {
        await uploadVenueImageApi(res.data.data._id, form.image);
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create venue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVenueImageUpdate = async (venueId, image) => {
    try {
      setError("");
      await uploadVenueImageApi(venueId, image);
      fetchVenues();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update image");
    } finally {
      setUploadingImageFor(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this venue?")) return;
    try { await deleteVenueApi(id); fetchVenues(); }
    catch (err) { setError(err.response?.data?.message || "Failed to delete venue"); }
  };

  if (loading) return <Loader />;

  const active = venues.filter((v) => v.isActive).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        padding: "40px 24px 36px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>
              Venue Management
            </h1>
            <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>
              {venues.length} venue{venues.length !== 1 ? "s" : ""} · {active} active
            </p>
          </div>
          <button
            onClick={() => setShowForm((p) => !p)}
            style={{
              padding: "10px 22px", borderRadius: 10, border: "2px solid rgba(255,255,255,0.3)",
              background: showForm ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.2)",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              backdropFilter: "blur(4px)",
            }}
          >
            {showForm ? "✕ Cancel" : "+ Add Venue"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 24px" }}>
        <ErrorMessage message={error} />

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Total Venues", value: venues.length,   color: "#4f46e5", border: "#c7d2fe" },
            { label: "Active",       value: active,           color: "#059669", border: "#6ee7b7" },
            { label: "Inactive",     value: venues.length - active, color: "#dc2626", border: "#fca5a5" },
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

        {/* Create form */}
        {showForm && (
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: 28, marginBottom: 28,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <div style={{ width: 4, height: 24, background: "var(--primary)", borderRadius: 4 }} />
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", margin: 0 }}>Add New Venue</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Venue Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. City Convention Hall" />
                </div>
                <div className="form-group">
                  <label>Capacity *</label>
                  <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required min={1} placeholder="Max attendees" />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input name="city" value={form.city} onChange={handleChange} required placeholder="Kathmandu" />
                </div>
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Address *</label>
                  <input name="address" value={form.address} onChange={handleChange} required placeholder="Full street address" />
                </div>
                <div className="form-group">
                  <label>Country *</label>
                  <input name="country" value={form.country} onChange={handleChange} required placeholder="Nepal" />
                </div>
                <div className="form-group">
                  <label>Amenities <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(comma-separated)</span></label>
                  <input name="amenities" value={form.amenities} onChange={handleChange} placeholder="Parking, WiFi, Stage" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <ImageUploader
                    label="Venue Image"
                    currentImage={form.image}
                    onImageSelect={(img) => setForm((p) => ({ ...p, image: img }))}
                  />
                </div>
              </div>
              <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: "10px 24px", fontWeight: 700 }}>
                  {submitting ? "Creating..." : "Create Venue"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: "10px 20px" }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Venue list */}
        {venues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", background: "#fff", borderRadius: 16, border: "1px dashed #d1d5db" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏛️</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 6 }}>No venues yet</p>
            <p style={{ fontSize: 14, color: "#64748b" }}>Add your first venue to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {venues.map((v) => (
              <div key={v._id} style={{
                background: "#fff", borderRadius: 14,
                border: "1px solid #e8ecf0",
                borderLeft: `4px solid ${v.isActive ? "#059669" : "#dc2626"}`,
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}>
                {v.image && (
                  <img src={v.image} alt={v.name} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                )}
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1e293b", margin: 0, lineHeight: 1.3 }}>{v.name}</h3>
                    <span style={{
                      background: v.isActive ? "#d1fae5" : "#fee2e2",
                      color: v.isActive ? "#065f46" : "#991b1b",
                      border: `1px solid ${v.isActive ? "#6ee7b7" : "#fca5a5"}`,
                      borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                    }}>
                      {v.isActive ? "● Active" : "● Inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <span style={{ fontSize: 13, color: "#475569", display: "flex", gap: 7 }}>
                      <span>📍</span>{v.location?.address}, {v.location?.city}
                    </span>
                    <span style={{ fontSize: 13, color: "#475569", display: "flex", gap: 7 }}>
                      <span>👥</span>Capacity: {v.capacity?.toLocaleString()}
                    </span>
                    {v.amenities?.length > 0 && (
                      <span style={{ fontSize: 13, color: "#475569", display: "flex", gap: 7 }}>
                        <span>✨</span>
                        {v.amenities.slice(0, 3).join(", ")}{v.amenities.length > 3 ? ` +${v.amenities.length - 3} more` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ padding: "10px 20px", borderTop: "1px solid #f1f5f9", background: "#fafbfc" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      onClick={() => setUploadingImageFor(uploadingImageFor === v._id ? null : v._id)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "#e0e7ff", color: "#3730a3", fontWeight: 700, fontSize: 13 }}
                    >
                      🖼️ {v.image ? "Change Image" : "Add Image"}
                    </button>
                    <button
                      onClick={() => handleDelete(v._id)}
                      style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 13 }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                  {uploadingImageFor === v._id && (
                    <div style={{ marginTop: 12 }}>
                      <ImageUploader
                        label=""
                        currentImage={v.image || ""}
                        onImageSelect={(img) => img && handleVenueImageUpdate(v._id, img)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVenueManagement;
