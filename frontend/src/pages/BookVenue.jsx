import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BookingForm from "../components/BookingForm";
import { bookVenueApi, getVenueByIdApi, checkMyBookingApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";
import Loader from "../components/Loader";

const BookVenue = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const [vRes, bRes] = await Promise.all([
          getVenueByIdApi(venueId),
          checkMyBookingApi(venueId),
        ]);
        setVenue(vRes.data.data || vRes.data);
        setHasActiveBooking(bRes.data.data?.hasActiveBooking || false);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load venue details");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [venueId]);

  const handleBooking = async (formData) => {
    try {
      setSubmitting(true);
      setError("");
      await bookVenueApi({ venueId, ...formData });
      navigate("/venues");
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>🏛️ Book Venue</h1>
          <p>{venue?.name || "Select your dates and submit a booking request"}</p>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>
      {/* Venue details card */}
      {venue && (
        <div style={{
          background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 28,
        }}>
          {venue.image ? (
            <img src={venue.image} alt={venue.name} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: 160, background: "linear-gradient(135deg, var(--primary-light), var(--primary-glow))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
              🏛️
            </div>
          )}
          <div style={{ padding: "20px 24px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginBottom: 12 }}>{venue.name}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(venue.location?.address || venue.address) && (
                <span style={{ fontSize: 14, color: "var(--text-muted)", display: "flex", gap: 8 }}>
                  📍 {venue.location?.address || venue.address}{venue.location?.city || venue.city ? `, ${venue.location?.city || venue.city}` : ""}
                </span>
              )}
              {(venue.capacity) && (
                <span style={{ fontSize: 14, color: "var(--text-muted)", display: "flex", gap: 8 }}>
                  👥 Capacity: {venue.capacity?.toLocaleString()}
                </span>
              )}
              {venue.description && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>{venue.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <ErrorMessage message={error} />

      {hasActiveBooking ? (
        <div style={{
          background: "var(--warning-light)", border: "1px solid var(--warning)", borderRadius: 12,
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--warning)", fontSize: 15 }}>Already Booked</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>You already have a pending or approved booking for this venue.</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>Book This Venue</h3>
          <BookingForm onSubmit={handleBooking} loading={submitting} />
        </div>
      )}
    </div>
    </div>
  );
};

export default BookVenue;