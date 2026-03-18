import { useEffect, useState } from "react";
import { getEventsApi } from "../api/eventApi";
import EventCard from "../components/EventCard";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getEventsApi();
        setEvents(res.data.data?.items || []);
      } catch {
        setError("Failed to fetch events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filtered = events.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.venue?.city?.toLowerCase().includes(search.toLowerCase()) ||
      e.genre?.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Loader />;

  return (
    <div className="container">
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--text)", marginBottom: 4 }}>Upcoming Events</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          {search && ` for "${search}"`}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 32, position: "relative", maxWidth: 480 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          placeholder="Search by title, city or genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 40, margin: 0, width: "100%" }}
        />
      </div>

      <ErrorMessage message={error} />

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎭</div>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>No events found</p>
          <p style={{ fontSize: 14 }}>{search ? "Try a different search term." : "Check back soon for upcoming events."}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {filtered.map((event, i) => (
            <EventCard key={event._id} event={event} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsList;
