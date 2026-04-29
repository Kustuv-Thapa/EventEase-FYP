import { Link } from "react-router-dom";

const SlotBadge = ({ capacity, registeredCount }) => {
  if (capacity == null) return null;
  const remaining = (capacity ?? 0) - (registeredCount ?? 0);
  if (remaining <= 0)
    return <span className="badge badge-sold-out">Sold Out</span>;
  if (remaining <= 5)
    return <span className="badge badge-low-stock">⚡ {remaining} left</span>;
  return <span className="badge badge-available">{remaining} slots</span>;
};

const EventCard = ({ event }) => {
  const gradientIndex = (parseInt(event._id?.slice(-1), 16) % 4) + 1;

  return (
    <div className="event-card">
      {/* Header: image or gradient fallback */}
      <div className={`event-card-header${!event.image ? ` event-card-gradient-${gradientIndex}` : ""}`}>
        {event.image && (
          <img src={event.image} alt={`${event.title} cover`} />
        )}
        <div className="event-card-overlay-badges">
          <span className="badge badge-genre">
            {event.genre?.[0]?.toUpperCase() || "EVENT"}
          </span>
          <span className={`badge ${event.pricing?.type === "FREE" ? "badge-free" : "badge-paid"}`}>
            {event.pricing?.type === "FREE" ? "Free" : `Rs. ${event.pricing?.price}`}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="event-card-body">
        <h3 className="event-card-title">{event.title}</h3>
        {event.description && (
          <p className="event-card-desc">
            {event.description.slice(0, 85)}{event.description.length > 85 ? "…" : ""}
          </p>
        )}
        <div className="event-card-meta">
          <span>
            <span>📅</span>
            {new Date(event.schedule?.startDateTime).toLocaleDateString("en-US", { dateStyle: "medium" })}
          </span>
          <span>
            <span>📍</span>
            {[event.venue?.name, event.venue?.city].filter(Boolean).join(", ") || "—"}
          </span>
          <span>
            <span>👤</span>
            {event.organizerId?.name || "Organizer"}
          </span>
        </div>
        <div className="event-card-slot">
          <SlotBadge capacity={event.capacity} registeredCount={event.registeredCount} />
        </div>
      </div>

      {/* Footer */}
      <div className="event-card-footer">
        <Link to={`/events/${event._id}`}>View Details →</Link>
      </div>
    </div>
  );
};

export default EventCard;
