import { Link } from "react-router-dom";
import "../assets/styles/cards.css";

const GRADIENTS = [
  "linear-gradient(135deg, #4f46e5, #7c3aed)",
  "linear-gradient(135deg, #0ea5e9, #6366f1)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #0ea5e9)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
];

const EventCard = ({ event, index = 0 }) => {
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius)",
      border: "1px solid var(--border)", boxShadow: "var(--shadow)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.13)"; }}
      onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
    >
      {/* Image or gradient header */}
      {event.image ? (
        <img src={event.image} alt={event.title} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ background: gradient, padding: "20px 20px 16px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
              {event.genre?.[0]?.toUpperCase() || "EVENT"}
            </span>
            <span style={{ background: event.pricing?.type === "FREE" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
              {event.pricing?.type === "FREE" ? "🎟 Free" : `NPR ${event.pricing?.price?.toLocaleString()}`}
            </span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>{event.title}</h3>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: "16px 20px", flex: 1 }}>
        {event.image && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {event.genre?.[0]?.toUpperCase() || "EVENT"}
            </span>
            <span style={{ background: event.pricing?.type === "FREE" ? "#dcfce7" : "var(--border)", color: event.pricing?.type === "FREE" ? "#166534" : "var(--text-muted)", borderRadius: 999, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
              {event.pricing?.type === "FREE" ? "🎟 Free" : `NPR ${event.pricing?.price?.toLocaleString()}`}
            </span>
          </div>
        )}
        {event.image && (
          <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3, marginBottom: 10, color: "var(--text)" }}>{event.title}</h3>
        )}
        {event.description && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
            {event.description.slice(0, 90)}{event.description.length > 90 ? "…" : ""}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7, alignItems: "center" }}>
            <span>📅</span>{new Date(event.schedule?.startDateTime).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7, alignItems: "center" }}>
            <span>📍</span>{event.venue?.name}, {event.venue?.city}
          </span>
          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 7, alignItems: "center" }}>
            <span>👤</span>By {event.organizerId?.name || "Organizer"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "#fafbfc" }}>
        <Link to={`/events/${event._id}`} style={{
          display: "block", textAlign: "center", background: "var(--primary)",
          color: "#fff", fontWeight: 600, fontSize: 13, padding: "9px",
          borderRadius: 8, textDecoration: "none",
        }}>
          View Details →
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
