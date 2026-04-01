import { useEffect, useState } from "react";
import { getEventsApi } from "../api/eventApi";
import EventCard from "../components/EventCard";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import EmptyState from "../components/EmptyState";

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getEventsApi()
      .then((res) => setEvents(res.data.data?.items || []))
      .catch(() => setError("Failed to fetch events"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.venue?.city?.toLowerCase().includes(search.toLowerCase()) ||
      e.genre?.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>Upcoming Events</h1>
          <p>
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
            {search && ` for "${search}"`}
          </p>
          <div style={{ position: "relative", maxWidth: 520, marginTop: 20 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none", opacity: 0.5 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by title, city or genre..."
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
            icon="🎭"
            title="No events found"
            message={search ? `No results for "${search}". Try a different search term.` : "Check back soon for upcoming events."}
          />
        ) : (
          <div className="grid">
            {filtered.map((event, i) => (
              <EventCard key={event._id} event={event} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;
