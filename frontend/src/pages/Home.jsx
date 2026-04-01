import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getEventsApi } from "../api/eventApi";
import EventCard from "../components/EventCard";
import EmptyState from "../components/EmptyState";

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
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #4338ca 0%, #6366f1 40%, #818cf8 100%)",
        padding: "96px 24px 80px",
        textAlign: "center",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.10)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 250, height: 250, borderRadius: "50%", background: "rgba(255,255,255,0.08)", filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 999, padding: "6px 16px", fontSize: 13, fontWeight: 600,
            marginBottom: 24, color: "#fff", letterSpacing: "0.02em",
          }}>
            ✦ Your Event Platform
          </div>
          <h1 style={{
            fontSize: "clamp(34px, 5.5vw, 56px)", fontWeight: 900,
            lineHeight: 1.12, marginBottom: 20, letterSpacing: "-0.03em", color: "#fff",
          }}>
            Discover & Manage<br />
            <span style={{ background: "linear-gradient(135deg, #e0e7ff, #fdf4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Events Effortlessly
            </span>
          </h1>
          <p style={{
            fontSize: 18, opacity: 0.85, lineHeight: 1.7, color: "#fff",
            marginBottom: 40, maxWidth: 500, margin: "0 auto 40px",
          }}>
            Find upcoming events, register in seconds, and let organizers handle the rest — all in one place.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/events" className="btn btn-primary btn-lg" style={{ background: "#fff", color: "#4338ca", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
              Browse Events →
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-ghost btn-lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>
                Get Started Free
              </Link>
            )}
            {isAuthenticated && user?.role === "ORGANIZER" && (
              <Link to="/organizer/events" className="btn btn-ghost btn-lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>
                Manage My Events
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats strip */}
        <div className="home-stats-strip" style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          background: "var(--surface)", borderRadius: "var(--radius)",
          border: "1px solid var(--border)", boxShadow: "var(--shadow-md)",
          overflow: "hidden", marginBottom: 56, marginTop: -32,
          position: "relative", zIndex: 1,
        }}>
          {[
            { icon: "🎭", label: "Live Events", sub: "Discover what's happening" },
            { icon: "🏛️", label: "Premium Venues", sub: "Curated locations" },
            { icon: "👥", label: "Community", sub: "Join thousands of attendees" },
          ].map(({ icon, label, sub }, i) => (
            <div key={label} style={{
              padding: "24px 20px", textAlign: "center",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Featured Events */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>Featured Events</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Upcoming events you don't want to miss</p>
            </div>
            <Link to="/events" style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: 4 }}>
              View all →
            </Link>
          </div>

          {featuredEvents.length === 0 ? (
            <EmptyState icon="🎭" title="No upcoming events" message="Check back soon." />
          ) : (
            <div className="grid">
              {featuredEvents.map((event, i) => (
                <EventCard key={event._id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.3px" }}>How It Works</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>Three simple steps to get started</p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              { step: "01", icon: "🔍", title: "Discover Events", desc: "Browse published events by category, date, or location." },
              { step: "02", icon: "✅", title: "Register Instantly", desc: "Sign up and register for events with a single click." },
              { step: "03", icon: "🎉", title: "Attend & Enjoy", desc: "Get your ticket and show up — it's that simple." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{
                background: "var(--surface)", borderRadius: "var(--radius)",
                padding: "32px 24px", textAlign: "center",
                border: "1px solid var(--border)", boxShadow: "var(--shadow)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 14, right: 16, fontSize: 11, fontWeight: 900, color: "var(--primary)", opacity: 0.2, letterSpacing: "0.05em" }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.2px" }}>{title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!isAuthenticated && (
          <div style={{
            background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)",
            borderRadius: "var(--radius-lg)", padding: "52px 32px",
            textAlign: "center", color: "#fff", marginBottom: 8,
            border: "1px solid #c7d2fe",
            boxShadow: "0 8px 40px rgba(99,102,241,0.20)",
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 10, letterSpacing: "-0.3px", color: "#fff" }}>Ready to get started?</h2>
            <p style={{ opacity: 0.85, fontSize: 15, marginBottom: 32, color: "#fff" }}>Join EventEase and never miss an event again.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" className="btn btn-primary btn-lg" style={{ background: "#fff", color: "#4338ca" }}>
                Create Free Account
              </Link>
              <Link to="/login" className="btn btn-ghost btn-lg" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)" }}>
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
