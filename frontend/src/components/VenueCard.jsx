import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import "../assets/styles/cards.css";

const VenueCard = ({ venue }) => {
  const { user } = useAuth();

  return (
    <div className="venue-card">
      {venue.image
        ? <img src={venue.image} alt={`${venue.name} venue`} className="venue-card-image" />
        : <div className="venue-card-placeholder">🏛️</div>
      }
      <div className="venue-card-body">
        <div className="venue-card-header-row">
          <h3>{venue.name}</h3>
          <span className={`badge ${venue.isActive ? "badge-approved" : "badge-rejected"}`}>
            {venue.isActive ? "Available" : "Unavailable"}
          </span>
        </div>
        <p>📍 {venue.location?.address}, {venue.location?.city}</p>
        <p>👥 Capacity: <strong>{venue.capacity?.toLocaleString()}</strong></p>
        {venue.pricePerHour && (
          <div className="venue-card-price">💰 Rs. {venue.pricePerHour}/hr</div>
        )}
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
      </div>
      {user?.role === "ORGANIZER" && venue.isActive && (
        <div className="venue-card-footer">
          <Link to={`/book-venue/${venue._id}`}>
            Book Venue →
          </Link>
        </div>
      )}
    </div>
  );
};

export default VenueCard;
