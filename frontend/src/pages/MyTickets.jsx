import { useEffect, useState } from "react";
import { getMyTicketsApi } from "../api/ticketApi";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

const STATUS_CONFIG = {
  VALID:     { label: "Valid",      color: "var(--success)",  bg: "var(--success-light)",  border: "var(--success)",  icon: "✅" },
  USED:      { label: "Used",       color: "var(--text-muted)", bg: "var(--surface-raised)", border: "var(--border)", icon: "✓" },
  CANCELLED: { label: "Cancelled",  color: "var(--danger)",   bg: "var(--danger-light)",   border: "var(--danger)",   icon: "🚫" },
};

const downloadTicket = (ticket) => {
  const event = ticket.event;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 340;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 600, 340);

  // Header bar
  ctx.fillStyle = "#4f46e5";
  ctx.fillRect(0, 0, 600, 70);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(event?.title || "Event Ticket", 20, 44);

  // Event info
  ctx.fillStyle = "#1e293b";
  ctx.font = "14px sans-serif";
  const startDate = event?.schedule?.startDateTime
    ? new Date(event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "";
  ctx.fillText(`📅 ${startDate}`, 20, 100);
  ctx.fillText(`📍 ${event?.venue?.name || ""}${event?.venue?.city ? ", " + event.venue.city : ""}`, 20, 124);
  ctx.fillStyle = "#64748b";
  ctx.font = "12px monospace";
  ctx.fillText(`Ticket ID: ${ticket.ticketId}`, 20, 152);

  // QR code
  const qrImg = new Image();
  qrImg.onload = () => {
    ctx.drawImage(qrImg, 380, 80, 200, 200);

    // Footer
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 290, 600, 50);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText("Present this ticket at the event entrance", 20, 320);

    const link = document.createElement("a");
    link.download = `ticket-${ticket.ticketId?.slice(0, 8)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  qrImg.src = ticket.qrCode;
};

const PAGE_SIZE = 5;

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQr, setExpandedQr] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getMyTicketsApi()
      .then((res) => setTickets(res.data.data || []))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load tickets"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div className="page-banner">
        <div className="page-banner-inner">
          <h1>🎟 My Tickets</h1>
          <p>{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        {tickets.length === 0 ? (
          <EmptyState
            icon="🎫"
            title="No tickets yet"
            message="Register for an event to get your ticket here."
          />
        ) : (
          <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ticket) => {
              const event = ticket.event;
              const startDate = event?.schedule?.startDateTime ? new Date(event.schedule.startDateTime) : null;
              const isExpanded = expandedQr === ticket._id;
              const isPastEvent = event?.status === "COMPLETED" || event?.status === "CANCELLED";
              const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.VALID;

              return (
                <div key={ticket._id} style={{
                  background: "var(--surface)", borderRadius: 16,
                  border: "1px solid var(--border)",
                  borderLeft: `4px solid ${cfg.border}`,
                  boxShadow: "var(--shadow-sm)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "20px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {startDate && (
                      <div style={{
                        minWidth: 56, textAlign: "center",
                        background: cfg.bg, borderRadius: 12, padding: "10px 8px",
                        border: `1px solid ${cfg.border}`,
                      }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                          {startDate.getDate()}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, textTransform: "uppercase" }}>
                          {startDate.toLocaleString("en-US", { month: "short" })}
                        </div>
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                          {event?.title || "Event"}
                        </h3>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {isPastEvent && ticket.status === "VALID" && (
                            <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                              🏁 Past Event
                            </span>
                          )}
                          <span className={`badge badge-${ticket.status?.toLowerCase()}`}>{cfg.icon} {cfg.label}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", marginBottom: 10 }}>
                        {event?.venue?.name && (
                          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 5 }}>
                            📍 {event.venue.name}{event.venue.city ? `, ${event.venue.city}` : ""}
                          </span>
                        )}
                        {startDate && (
                          <span style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 5 }}>
                            🕐 {startDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                        ID: {ticket.ticketId}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => setExpandedQr(isExpanded ? null : ticket._id)}
                        style={{
                          padding: "8px 16px", borderRadius: 10, border: "1.5px solid",
                          borderColor: isExpanded ? "var(--primary)" : "var(--border)",
                          background: isExpanded ? "var(--primary-light)" : "var(--surface)",
                          color: isExpanded ? "var(--primary)" : "var(--text-secondary)",
                          fontWeight: 700, fontSize: 13, cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isExpanded ? "Hide QR" : "Show QR"}
                      </button>
                      {ticket.status === "VALID" && !isPastEvent && (
                        <button
                          onClick={() => downloadTicket(ticket)}
                          style={{
                            padding: "8px 16px", borderRadius: 10, border: "1.5px solid var(--success)",
                            background: "var(--success-light)", color: "var(--success)",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ⬇ Download
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      borderTop: "1px solid var(--border)", padding: "24px",
                      background: "var(--surface)",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    }}>
                      {ticket.status !== "VALID" && (
                        <div style={{
                          background: cfg.bg, color: cfg.color, borderRadius: 8,
                          padding: "8px 16px", fontSize: 13, fontWeight: 600,
                          border: `1px solid ${cfg.border}`,
                        }}>
                          {ticket.status === "USED" ? "This ticket has already been used" : "This ticket has been cancelled"}
                        </div>
                      )}
                      <img
                        src={ticket.qrCode}
                        alt="QR Code"
                        style={{
                          width: 200, height: 200, borderRadius: 12,
                          border: "2px solid var(--border)",
                          opacity: ticket.status !== "VALID" ? 0.4 : 1,
                          filter: ticket.status !== "VALID" ? "grayscale(1)" : "none",
                        }}
                      />
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                        Show this QR code at the event entrance
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {Math.ceil(tickets.length / PAGE_SIZE) > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
                Page {page} of {Math.ceil(tickets.length / PAGE_SIZE)}
              </span>
              <button onClick={() => setPage(p => Math.min(Math.ceil(tickets.length / PAGE_SIZE), p + 1))} disabled={page === Math.ceil(tickets.length / PAGE_SIZE)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13, cursor: page === Math.ceil(tickets.length / PAGE_SIZE) ? "not-allowed" : "pointer", opacity: page === Math.ceil(tickets.length / PAGE_SIZE) ? 0.5 : 1 }}>
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

export default MyTickets;
