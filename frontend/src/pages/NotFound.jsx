import { Link } from "react-router-dom";

const NotFound = () => (
  <div style={{
    minHeight: "calc(100vh - 62px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)", padding: "40px 24px",
  }}>
    <div style={{ textAlign: "center", maxWidth: 480 }}>
      <div style={{
        fontSize: 96, fontWeight: 900, lineHeight: 1,
        background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 16,
      }}>
        404
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 10, letterSpacing: "-0.3px" }}>
        Page not found
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/" style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
          color: "#fff", fontWeight: 700, fontSize: 14,
          padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none",
          boxShadow: "var(--shadow-primary)",
        }}>
          Go Home
        </Link>
        <Link to="/events" style={{
          background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14,
          padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none",
          border: "1.5px solid var(--border)",
        }}>
          Browse Events
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;
