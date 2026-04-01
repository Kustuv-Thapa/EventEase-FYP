import { Link, useNavigate } from "react-router-dom";

const Unauthorized = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "calc(100vh - 62px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "40px 24px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 10, letterSpacing: "-0.3px" }}>
          Access denied
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          You don't have permission to view this page. Please sign in with an account that has the required access.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14,
              padding: "11px 24px", borderRadius: "var(--radius-sm)",
              border: "1.5px solid var(--border)", cursor: "pointer",
            }}
          >
            ← Go Back
          </button>
          <Link to="/login" style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
            color: "#fff", fontWeight: 700, fontSize: 14,
            padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none",
            boxShadow: "var(--shadow-primary)",
          }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
