import { useState, useEffect, useRef } from "react";
import { verifyTicketApi } from "../api/ticketApi";
import ErrorMessage from "../components/ErrorMessage";

const RESULT_STYLE = {
  success: { bg: "#dcfce7", border: "#22c55e", color: "#166534", icon: "✅" },
  used:    { bg: "#fef3c7", border: "#f59e0b", color: "#92400e", icon: "⚠️" },
  cancelled: { bg: "#fee2e2", border: "#ef4444", color: "#991b1b", icon: "🚫" },
  error:   { bg: "#fee2e2", border: "#ef4444", color: "#991b1b", icon: "❌" },
};

const getResultStyle = (result) => {
  if (!result) return null;
  if (result.success) return RESULT_STYLE.success;
  const msg = result.message || "";
  if (msg.includes("already used")) return RESULT_STYLE.used;
  if (msg.includes("cancelled")) return RESULT_STYLE.cancelled;
  return RESULT_STYLE.error;
};

const VerifyTicket = () => {
  const [ticketId, setTicketId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const doVerify = async (id) => {
    if (!id?.trim()) return;
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await verifyTicketApi(id.trim());
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    await doVerify(ticketId);
  };

  const startScanner = async () => {
    setCameraError("");
    setScannerActive(true);
  };

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.clear().catch(() => {});
      scannerInstanceRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    if (!scannerActive) return;

    let mounted = true;

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (decodedText) => {
            // Try to parse ticketId from JSON payload
            let id = decodedText;
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.ticketId) id = parsed.ticketId;
            } catch {
              // raw string — use as-is
            }
            setTicketId(id);
            stopScanner();
            doVerify(id);
          },
          (err) => {
            // Ignore scan errors (camera still scanning)
            if (err?.includes("permission")) {
              setCameraError("Camera access denied. Please use manual entry.");
              stopScanner();
            }
          }
        );

        scannerInstanceRef.current = scanner;
      } catch {
        setCameraError("Failed to initialize camera scanner.");
        setScannerActive(false);
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
        scannerInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerActive]);

  const ticket = result?.data;
  const style = getResultStyle(result);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        padding: "40px 24px 36px", color: "#fff",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>🔍 Verify Ticket</h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: 0 }}>Scan QR code or enter ticket ID manually</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
        <ErrorMessage message={error} />
        {cameraError && <ErrorMessage message={cameraError} />}

        {/* Scanner section */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: "flex", gap: 10, marginBottom: scannerActive ? 16 : 0 }}>
            {!scannerActive ? (
              <button
                onClick={startScanner}
                style={{
                  padding: "10px 20px", borderRadius: 10, border: "1.5px solid #4f46e5",
                  background: "#eef2ff", color: "#4f46e5", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                📷 Start Scanner
              </button>
            ) : (
              <button
                onClick={stopScanner}
                style={{
                  padding: "10px 20px", borderRadius: 10, border: "1.5px solid #ef4444",
                  background: "#fee2e2", color: "#991b1b", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >
                ⏹ Stop Scanner
              </button>
            )}
          </div>

          {scannerActive && (
            <div id="qr-reader" ref={scannerRef} style={{ width: "100%" }} />
          )}
        </div>

        {/* Manual input */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #e8ecf0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)", padding: 24, marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12, fontWeight: 600 }}>Or enter ticket ID manually:</p>
          <form onSubmit={handleVerify} style={{ display: "flex", gap: 10 }}>
            <input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Paste ticket ID (UUID)..."
              style={{
                flex: 1, padding: "11px 16px", borderRadius: 10,
                border: "1.5px solid #d1d5db", fontSize: 14,
                fontFamily: "monospace", outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !ticketId.trim()}
              className="btn-primary"
              style={{ padding: "11px 22px", fontWeight: 700, whiteSpace: "nowrap" }}
            >
              {loading ? "Checking..." : "Verify"}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && ticket && style && (
          <div style={{
            background: "#fff", borderRadius: 16,
            border: `2px solid ${style.border}`,
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              background: style.bg, padding: "16px 24px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>{style.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: style.color }}>
                  {result.message}
                </div>
                <div style={{ fontSize: 12, color: style.color, opacity: 0.8 }}>
                  Ticket status: {ticket.status}
                </div>
              </div>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <Row label="Event" value={ticket.event?.title} />
              <Row label="Attendee" value={ticket.user?.name} />
              <Row label="Email" value={ticket.user?.email} />
              {ticket.event?.venue?.name && (
                <Row label="Venue" value={`${ticket.event.venue.name}, ${ticket.event.venue.city || ""}`} />
              )}
              {ticket.event?.schedule?.startDateTime && (
                <Row
                  label="Date"
                  value={new Date(ticket.event.schedule.startDateTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                />
              )}
              <Row label="Ticket ID" value={ticket.ticketId} mono />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
    <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, minWidth: 80 }}>{label}</span>
    <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
      {value || "—"}
    </span>
  </div>
);

export default VerifyTicket;
