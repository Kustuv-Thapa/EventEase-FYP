import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getEventsApi } from "../api/eventApi";

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);

  useEffect(() => {
    getEventsApi()
      .then((res) => setFeaturedEvents((res.data.data?.items || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero — full width, no container padding */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6d28d9 100%)",
        padding: "80px 20px",
        textAlign: "center",
        color: "#fff",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "6px 18px", fontSize: 13, fontWeight: 600, marginBottom: 20, letterSpacing: "0.05em" }}>
            🎉 Your Event Platform
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
            Discover & Manage<br />Events Effortlessly
          </h1>
          <p style={{ fontSize: 18, opacity: 0.85, lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Find upcoming events, register in seconds, and let organizers handle the rest — all in one place.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/events" style={{
              background: "#fff", color: "#4338ca", fontWeight: 700, fontSize: 15,
              padding: "12px 28px", borderRadius: 10, textDecoration: "none",
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)", transition: "transform 0.15s",
            }}>
              Browse Events →
            </Link>
            {!isAuthenticated && (
              <Link to="/register" style={{
                background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 15,
                padding: "12px 28px", borderRadius: 10, textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}>
                Get Started Free
              </Link>
            )}
            {isAuthenticated && user?.role === "ORGANIZER" && (
              <Link to="/organizer/events" style={{
                background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 15,
                padding: "12px 28px", borderRadius: 10, textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.35)",
              }}>
                Manage My Events
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 1, background: "var(--border)", borderRadius: "var(--radius)",
          overflow: "hidden", boxShadow: "var(--shadow)", marginBottom: 56, marginTop: -28,
        }}>
          {[["🎭", "Events", "Discover live events"], ["🏛️", "Venues", "Premium locations"], ["👥", "Community", "Join thousands"]].map(([icon, label, sub]) => (
            <div key={label} style={{ background: "var(--surface)", padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Featured Events */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>Featured Events</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Upcoming events you don't want to miss</p>
            </div>
            <Link to="/events" style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
              View all →
            </Link>
          </div>

          {featuredEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎭</div>
              <p>No upcoming events yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid">
              {featuredEvents.map((event) => (
                <div key={event._id} style={{
                  background: "var(--surface)", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)", boxShadow: "var(--shadow)",
                  overflow: "hidden", display: "flex", flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                  onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
                  onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                >
                  {/* Image or color bar */}
                  {event.image
                    ? <img src={event.image} alt={event.title} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                    : <div style={{ height: 5, background: "linear-gradient(90deg, #4f46e5, #7c3aed)" }} />
                  }
                  <div style={{ padding: 22, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {event.genre?.[0] || "Event"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: event.pricing?.type === "FREE" ? "#166534" : "var(--text-muted)", background: event.pricing?.type === "FREE" ? "#dcfce7" : "var(--border)", padding: "2px 8px", borderRadius: 999 }}>
                        {event.pricing?.type === "FREE" ? "Free" : `NPR ${event.pricing?.price?.toLocaleString()}`}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "var(--text)", lineHeight: 1.3 }}>{event.title}</h3>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                      📅 {new Date(event.schedule?.startDateTime).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      📍 {event.venue?.name}, {event.venue?.city}
                    </p>
                  </div>
                  <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
                    <Link to={`/events/${event._id}`} style={{
                      display: "block", textAlign: "center", background: "var(--primary)",
                      color: "#fff", fontWeight: 600, fontSize: 13, padding: "9px",
                      borderRadius: 8, textDecoration: "none",
                    }}>
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 8 }}>How It Works</h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14, marginBottom: 36 }}>Three simple steps to get started</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              { step: "01", icon: "🔍", title: "Discover Events", desc: "Browse published events by category, date, or location." },
              { step: "02", icon: "✅", title: "Register", desc: "Sign up and register for events with a single click." },
              { step: "03", icon: "🎉", title: "Attend & Enjoy", desc: "Get approved and show up — it's that simple." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="card" style={{ textAlign: "center", padding: "32px 24px", position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, fontWeight: 800, color: "var(--primary)", opacity: 0.3, letterSpacing: "0.05em" }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        {!isAuthenticated && (
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b, #4f46e5)",
            borderRadius: "var(--radius)", padding: "48px 32px",
            textAlign: "center", color: "#fff", marginBottom: 8,
          }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Ready to get started?</h2>
            <p style={{ opacity: 0.85, fontSize: 15, marginBottom: 28 }}>Join EventEase and never miss an event again.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" style={{ background: "#fff", color: "#4338ca", fontWeight: 700, fontSize: 15, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>
                Create Account
              </Link>
              <Link to="/login" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600, fontSize: 15, padding: "12px 28px", borderRadius: 10, textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.35)" }}>
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
