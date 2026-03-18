import { useEffect, useState } from "react";
import { getVenuesApi } from "../api/venueApi";
import VenueCard from "../components/VenueCard";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";

const VenueList = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await getVenuesApi();
        setVenues(res.data.data || []);
      } catch (err) {
        setError("Failed to fetch venues");
      } finally {
        setLoading(false);
      }
    };
    fetchVenues();
  }, []);

  const filtered = venues.filter((v) =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-header">
        <h2>Venues</h2>
        <input
          type="text"
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240, margin: 0 }}
        />
      </div>
      <ErrorMessage message={error} />
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>🏛️</div>
          <p>No venues found.</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((venue) => <VenueCard key={venue._id} venue={venue} />)}
        </div>
      )}
    </div>
  );
};

export default VenueList;