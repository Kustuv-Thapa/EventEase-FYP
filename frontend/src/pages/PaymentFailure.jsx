import { Link } from "react-router-dom";

const PaymentFailure = () => (
  <div style={{
    minHeight: "calc(100vh - 62px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "var(--bg)", padding: "40px 24px",
  }}>
    <div style={{
      background: "var(--surface)", borderRadius: "var(--radius-xl)",
      border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 8px 40px rgba(239,68,68,0.10)",
      padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%",
    }}>
      <div className="payment-icon-failure" style={{ fontSize: 64, marginBottom: 16, color: "var(--danger)" }}>❌</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--danger)", marginBottom: 10, letterSpacing: "-0.3px" }}>
        Payment Failed
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
        Your payment was not completed. Your registration is still pending — you can try paying again from My Registrations.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/my-registrations" className="btn btn-primary btn-lg">
          Try Again →
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

export default PaymentFailure;
