import { useEffect, useState } from "react";
import { getMyVenueBookingsApi } from "../api/venueApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";

const MyVenueBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await getMyVenueBookingsApi();
        setBookings(res.data.data || []);
      } catch (err) {
        setError("Failed to fetch venue bookings");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      <h2>My Venue Bookings</h2>
      <ErrorMessage message={error} />
      {bookings.map((booking) => (
        <div key={booking._id} className="card">
          <h3>{booking.venue?.name}</h3>
          <p>From: {new Date(booking.startDateTime).toLocaleString()}</p>
          <p>To: {new Date(booking.endDateTime).toLocaleString()}</p>
          <p>Status: {booking.status}</p>
        </div>
      ))}
    </div>
  );
};

export default MyVenueBookings;