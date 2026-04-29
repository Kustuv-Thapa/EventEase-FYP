import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getVenuesApi } from "../api/venueApi";
import VenueCard from "../components/VenueCard";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";
import useAuth from "../hooks/useAuth";

const PAGE_SIZE = 9;

const VenueList = () => {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const isOrganizer = user?.role === "ORGANIZER";

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>Venues</h1>
          <p>
            {isOrganizer
              ? "Select a venue to create your event"
              : `${filtered.length} venue${filtered.length !== 1 ? "s" : ""} available${search ? ` for "${search}"` : ""}`
            }
          </p>
          <div style={{ position: "relative", maxWidth: 520, marginTop: 20 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none", opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ paddingLeft: 42, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", color: "#fff" }}
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>
        {isOrganizer && (
          <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
            <div style={{ fontSize: 14, color: "#3730a3", lineHeight: 1.6 }}>
              <strong>Creating an event?</strong> Click "Create Event Here →" on a venue card to go directly to the event creation form with that venue pre-selected.
            </div>
          </div>
        )}

        <ErrorMessage message={error} />

        {filtered.length === 0 ? (
          <EmptyState
            icon="🏛️"
            title="No venues found"
            message={search ? `No results for "${search}". Try a different search term.` : "No venues available yet."}
          />
        ) : (
          <>
            <div className="grid">
              {paginated.map((venue) => <VenueCard key={venue._id} venue={venue} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 32 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
                  ← Prev
                </button>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VenueList;
