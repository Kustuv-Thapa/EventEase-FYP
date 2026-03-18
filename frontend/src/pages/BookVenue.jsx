import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BookingForm from "../components/BookingForm";
import { bookVenueApi } from "../api/venueApi";
import ErrorMessage from "../components/ErrorMessage";

const BookVenue = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBooking = async (formData) => {
    try {
      setLoading(true);
      setError("");

      await bookVenueApi({
        venueId,
        ...formData
      });

      navigate("/venues");
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Book Venue</h2>
      <ErrorMessage message={error} />
      <BookingForm onSubmit={handleBooking} loading={loading} />
    </div>
  );
};

export default BookVenue;