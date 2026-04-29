import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getEventByIdApi } from "../api/eventApi";
import { registerForEventApi } from "../api/registrationApi";
import { initiateKhaltiPaymentApi } from "../api/khaltiApi";
import Loader from "../components/Loader";
import ErrorMessage from "../components/ErrorMessage";
import useAuth from "../hooks/useAuth";

const fmt = (d, opts) => d ? new Date(d).toLocaleString("en-US", opts) : "—";

const InfoCard = ({ icon, label, children }) => (
  <div style={{
    background: "#fff", borderRadius: 12, padding: "16px 18px",
    border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    display: "flex", gap: 14, alignItems: "flex-start",
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: 10, background: "#eef2ff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 18, flexShrink: 0,
    }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  </div>
);

export default function EventDetails() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    getEventByIdApi(id)
      .then((res) => setEvent(res.data.data))
      .catch(() => setFetchError("Failed to fetch event details"));
  }, [id]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const res = await registerForEventApi(id);
      if (res.data.requiresPayment) {
        const regId = res.data.data.registration._id;
        const payRes = await initiateKhaltiPaymentApi(regId);
        window.location.href = payRes.data.payment_url;
        return;
      }
      setMessage("You're registered! Your ticket has been issued.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
      setMessage("");
    } finally {
      setRegistering(false);
    }
  };

  if (fetchError) return (
    <div className="container">
      <div className="empty-state"><div className="empty-icon">😕</div><h3>Event not found</h3><p>{fetchError}</p></div>
    </div>
  );
  if (!event) return <Loader />;

  const remaining = event.capacity != null ? Math.max(0, event.capacity - (event.confirmedCount ?? event.registeredCount ?? 0)) : null;
  const pct = remaining != null && event.capacity > 0 ? Math.round(((event.capacity - remaining) / event.capacity) * 100) : 0;
  const organizerId = event.organizerId?._id || event.organizerId;
  const isOwner = user && organizerId?.toString() === user.id;
  const isAdmin = user?.role === "ADMIN";
  const isFree = event.pricing?.type === "FREE";

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Hero ── */}
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
        {event.image ? (
          <>
            <img src={event.image} alt={event.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.35) 55%, transparent 100%)" }} />
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)" }} />
        )}

        {/* Back button */}
        <div style={{ position: "absolute", top: 20, left: 24, zIndex: 2 }}>
          <Link to="/events" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            color: "#fff", borderRadius: 999, padding: "7px 16px",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.25)",
          }}>← Events</Link>
        </div>

        {/* Hero content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "0 24px 32px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            {/* Tags */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {event.genre?.slice(0, 3).map((g) => (
                <span key={g} style={{ background: "rgba(99,102,241,0.75)", backdropFilter: "blur(6px)", color: "#fff", borderRadius: 999, padding: "3px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {g.toUpperCase()}
                </span>
              ))}
              <span style={{
                background: isFree ? "rgba(34,197,94,0.75)" : "rgba(99,102,241,0.75)",
                backdropFilter: "blur(6px)", color: "#fff",
                borderRadius: 999, padding: "3px 12px", fontSize: 11, fontWeight: 700,
              }}>
                {isFree ? "🎟 Free" : `🎟 NPR ${event.pricing?.price?.toLocaleString()}`}
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 14, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
              {event.title}
            </h1>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {event.schedule?.startDateTime && (
                <span style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "5px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  📅 {fmt(event.schedule.startDateTime, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
              {event.venue?.city && (
                <span style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "5px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  📍 {event.venue.name ? `${event.venue.name}, ` : ""}{event.venue.city}
                </span>
              )}
              {remaining !== null && (
                <span style={{
                  background: remaining <= 0 ? "rgba(239,68,68,0.7)" : remaining <= 10 ? "rgba(245,158,11,0.7)" : "rgba(34,197,94,0.7)",
                  backdropFilter: "blur(6px)", color: "#fff", borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 600,
                }}>
                  👥 {remaining <= 0 ? "Sold Out" : `${remaining} seats left`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 48px" }}>
        <div className="event-details-grid">

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* About */}
            {event.description && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 26px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 18, background: "#6366f1", borderRadius: 4, display: "inline-block" }} />
                  About this event
                </h2>
                <p style={{ color: "#475569", lineHeight: 1.85, fontSize: 15 }}>{event.description}</p>
              </div>
            )}

            {/* Info grid */}
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Event Details</h2>
              <div className="event-info-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InfoCard icon="📅" label="Date & Time">
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                    {fmt(event.schedule?.startDateTime, { dateStyle: "long", timeStyle: "short" })}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                    Ends {fmt(event.schedule?.endDateTime, { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </InfoCard>

                <InfoCard icon="📍" label="Venue">
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{event.venue?.name || "—"}</div>
                  {event.venue?.address && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{event.venue.address}, {event.venue.city}</div>
                  )}
                </InfoCard>

                <InfoCard icon="🎟" label="Pricing">
                  <div style={{ fontWeight: 800, fontSize: 16, color: isFree ? "#16a34a" : "#4338ca" }}>
                    {isFree ? "Free Entry" : `NPR ${event.pricing?.price?.toLocaleString()}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{isFree ? "No payment required" : "Paid via Khalti"}</div>
                </InfoCard>

                <InfoCard icon="👤" label="Organizer">
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{event.organizerId?.name || "—"}</div>
                  {event.organizerId?.email && (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{event.organizerId.email}</div>
                  )}
                </InfoCard>

                {event.capacity && (
                  <InfoCard icon="👥" label="Capacity">
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{event.capacity?.toLocaleString()} seats total</div>
                    {remaining !== null && (
                      <div style={{ fontSize: 13, color: remaining <= 0 ? "#dc2626" : remaining <= 10 ? "#d97706" : "#16a34a", marginTop: 3, fontWeight: 600 }}>
                        {remaining <= 0 ? "Sold out" : `${remaining} remaining`}
                      </div>
                    )}
                  </InfoCard>
                )}

                {event.genre?.length > 0 && (
                  <InfoCard icon="🎭" label="Genre">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                      {event.genre.map((g) => (
                        <span key={g} style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{g}</span>
                      ))}
                    </div>
                  </InfoCard>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="event-details-sidebar">
            <div style={{
              background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0",
              boxShadow: "0 4px 24px rgba(99,102,241,0.10)", overflow: "hidden",
            }}>
              {/* Pricing header */}
              <div style={{
                padding: "20px 22px",
                background: isFree ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                borderBottom: `1px solid ${isFree ? "#bbf7d0" : "#e0e7ff"}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isFree ? "#15803d" : "#4338ca", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                  {isFree ? "Free Event" : "Paid Event"}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: isFree ? "#16a34a" : "#4338ca", lineHeight: 1 }}>
                  {isFree ? "Free" : `NPR ${event.pricing?.price?.toLocaleString()}`}
                </div>
                {!isFree && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>per person · via Khalti</div>}
              </div>

              {/* Availability */}
              {remaining !== null && (
                <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9" }}>
                  {remaining <= 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff1f2", borderRadius: 10, padding: "12px 14px", border: "1px solid #fecdd3" }}>
                      <span style={{ fontSize: 22 }}>🚫</span>
                      <div>
                        <div style={{ fontWeight: 800, color: "#b91c1c", fontSize: 14 }}>Sold Out</div>
                        <div style={{ fontSize: 12, color: "#dc2626" }}>All {event.capacity} seats are taken</div>
                      </div>
                    </div>
                  ) : remaining <= 10 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", borderRadius: 10, padding: "12px 14px", border: "1px solid #fde68a" }}>
                      <span style={{ fontSize: 22 }}>⚡</span>
                      <div>
                        <div style={{ fontWeight: 800, color: "#b45309", fontSize: 14 }}>Almost Full!</div>
                        <div style={{ fontSize: 12, color: "#d97706" }}>Only {remaining} seat{remaining !== 1 ? "s" : ""} left</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Availability</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>{remaining} / {event.capacity} seats</span>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#22c55e", borderRadius: 999, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{pct}% filled</div>
                    </div>
                  )}
                </div>
              )}

              {/* Action */}
              <div style={{ padding: "20px 22px" }}>
                {message && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span>🎉</span>
                    <span style={{ fontSize: 14, color: "#15803d", fontWeight: 600 }}>{message}</span>
                  </div>
                )}
                <ErrorMessage message={error} />

                {!isAuthenticated ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ color: "#64748b", fontSize: 14, marginBottom: 14, lineHeight: 1.5 }}>Sign in to register for this event</p>
                    <Link to="/login" style={{
                      display: "block", textAlign: "center",
                      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", fontWeight: 700, padding: "13px",
                      borderRadius: 12, textDecoration: "none", fontSize: 15,
                      boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
                    }}>
                      Sign In to Register
                    </Link>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>Don't have an account? <Link to="/register" style={{ color: "#6366f1", fontWeight: 600 }}>Sign up free</Link></p>
                  </div>
                ) : isAdmin ? (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 10px" }}>🛡️</div>
                    <p style={{ color: "#0369a1", fontSize: 14, fontWeight: 700 }}>Admin View</p>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>Admins cannot register for events</p>
                  </div>
                ) : isOwner ? (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 10px" }}>🎪</div>
                    <p style={{ color: "#4338ca", fontSize: 14, fontWeight: 700 }}>You're the organizer</p>
                    <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>You cannot register for your own event</p>
                  </div>
                ) : !message ? (
                  <button
                    onClick={handleRegister}
                    disabled={registering || remaining === 0}
                    style={{
                      width: "100%", padding: "14px", fontSize: 15, fontWeight: 800,
                      borderRadius: 12, border: "none", cursor: remaining === 0 ? "not-allowed" : "pointer",
                      background: remaining === 0 ? "#f1f5f9" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: remaining === 0 ? "#94a3b8" : "#fff",
                      boxShadow: remaining === 0 ? "none" : "0 4px 14px rgba(99,102,241,0.3)",
                      transition: "all 0.15s",
                      opacity: registering ? 0.75 : 1,
                    }}
                  >
                    {registering ? "Registering…" : remaining === 0 ? "Event Full" : isFree ? "Register for Free →" : `Pay NPR ${event.pricing?.price?.toLocaleString()} →`}
                  </button>
                ) : null}

                {/* Quick info below button */}
                {!isOwner && !isAdmin && !message && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                      <span>✓</span><span>Instant confirmation</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                      <span>✓</span><span>QR ticket issued immediately</span>
                    </div>
                    {!isFree && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                      <span>✓</span><span>Secure payment via Khalti</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
