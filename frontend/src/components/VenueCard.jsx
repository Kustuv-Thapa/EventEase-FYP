import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../assets/styles/cards.css";

const VenueCard = ({ venue }) => {
  const { user } = useAuth();

  return (
    <div className="venue-card">
      <div className="venue-card-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <h3>{venue.name}</h3>
          <span className={`badge ${venue.isActive ? "badge-approved" : "badge-rejected"}`}>
            {venue.isActive ? "Available" : "Unavailable"}
          </span>
        </div>
        <p>📍 {venue.location?.address}, {venue.location?.city}</p>
        <p>👥 Capacity: {venue.capacity?.toLocaleString()}</p>
        {venue.amenities?.length > 0 && (
          <div className="amenity-tags">
            {venue.amenities.slice(0, 4).map((a, i) => (
              <span key={i} className="amenity-tag">{a}</span>
            ))}
            {venue.amenities.length > 4 && (
              <span className="amenity-tag">+{venue.amenities.length - 4} more</span>
            )}
          </div>
        )}
        {user?.role === "ORGANIZER" && venue.isActive && (
          <div style={{ marginTop: 14 }}>
            <Link
              to={`/book-venue/${venue._id}`}
              className="btn-primary"
              style={{ display: "inline-block", padding: "8px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none", borderRadius: 8 }}
            >
              Book Venue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueCard;
