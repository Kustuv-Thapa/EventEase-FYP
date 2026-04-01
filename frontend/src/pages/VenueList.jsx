import { useEffect, useState } from "react";
import { getVenuesApi } from "../api/venueApi";
import VenueCard from "../components/VenueCard";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const VenueList = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getVenuesApi()
      .then((res) => setVenues(res.data.data || []))
      .catch(() => setError("Failed to fetch venues"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = venues.filter((v) =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>Venues</h1>
          <p>
            {filtered.length} venue{filtered.length !== 1 ? "s" : ""} available
            {search && ` for "${search}"`}
          </p>
          <div style={{ position: "relative", maxWidth: 520, marginTop: 20 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none", opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 42, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#fff" }}
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>
        <ErrorMessage message={error} />
        {filtered.length === 0 ? (
          <EmptyState
            icon="🏛️"
            title="No venues found"
            message={search ? `No results for "${search}". Try a different search term.` : "No venues available yet."}
          />
        ) : (
          <div className="grid">
            {filtered.map((venue) => <VenueCard key={venue._id} venue={venue} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueList;
