import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventByIdApi } from "../api/eventApi";
import { registerForEventApi } from "../api/registrationApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import useAuth from "../hooks/useAuth";

const EventDetails = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await getEventByIdApi(id);
        setEvent(res.data.data);
      } catch (err) {
        setError("Failed to fetch event details");
      }
    };
    fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      await registerForEventApi(id);
      setMessage("Successfully registered! Awaiting approval.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setMessage("");
    } finally {
      setRegistering(false);
    }
  };

  if (!event) return <Loader />;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card" style={{ padding: 32 }}>
        {event.image && (
          <img src={event.image} alt={event.title} style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 10, marginBottom: 24, display: "block" }} />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>{event.title}</h2>
          <span className={`badge badge-${event.status?.toLowerCase()}`}>{event.status}</span>
        </div>

        {event.description && (
          <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.7 }}>{event.description}</p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 16, boxShadow: "none", background: "#f8fafc" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Date &amp; Time</p>
            <p style={{ fontWeight: 600 }}>{new Date(event.schedule?.startDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>to {new Date(event.schedule?.endDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
          <div className="card" style={{ padding: 16, boxShadow: "none", background: "#f8fafc" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Venue</p>
            <p style={{ fontWeight: 600 }}>{event.venue?.name}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{event.venue?.address}, {event.venue?.city}</p>
          </div>
          <div className="card" style={{ padding: 16, boxShadow: "none", background: "#f8fafc" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Pricing</p>
            <p style={{ fontWeight: 600 }}>
              {event.pricing?.type === "FREE" ? "Free Entry" : `NPR ${event.pricing?.price?.toLocaleString()}`}
            </p>
          </div>
          <div className="card" style={{ padding: 16, boxShadow: "none", background: "#f8fafc" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Organizer</p>
            <p style={{ fontWeight: 600 }}>{event.organizerId?.name}</p>
          </div>
        </div>

        {message && <div className="alert alert-success">{message}</div>}
        <ErrorMessage message={error} />

        {(() => {
          const organizerId = event.organizerId?._id || event.organizerId;
          const isOwner = user && organizerId?.toString() === user.id;
          if (!isAuthenticated) {
            return <p style={{ color: "var(--text-muted)", fontSize: 14 }}><a href="/login">Login</a> to register for this event.</p>;
          }
          if (isOwner) {
            return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>You are the organizer of this event.</p>;
          }
          if (!message) {
            return (
              <button className="btn-primary" onClick={handleRegister} disabled={registering} style={{ padding: "11px 28px", fontSize: 15 }}>
                {registering ? "Registering..." : "Register for this Event"}
              </button>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

export default EventDetails;