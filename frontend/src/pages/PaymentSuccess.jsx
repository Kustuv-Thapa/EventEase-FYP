import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEsewaCallbackApi } from "../api/esewaApi";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed

  useEffect(() => {
    const data = searchParams.get("data");
    if (!data) {
      setStatus("success"); // no data param means backend already processed it
      return;
    }

    verifyEsewaCallbackApi(data)
      .then(() => setStatus("success"))
      .catch(() => setStatus("failed"));
  }, []);

  if (status === "verifying") {
    return (
      <div style={{
        minHeight: "calc(100vh - 62px)", display: "flex",
        alignItems: "center", justifyContent: "center", background: "var(--bg)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{
        minHeight: "calc(100vh - 62px)", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)", padding: "40px 24px",
      }}>
        <div style={{
          background: "var(--surface)", borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 8px 40px rgba(239,68,68,0.10)",
          padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%",
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>
            Verification Failed
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Payment could not be verified. Please check My Registrations and try again.
          </p>
          <Link to="/my-registrations" style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
            color: "#fff", fontWeight: 700, fontSize: 14,
            padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none",
          }}>
            My Registrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "calc(100vh - 62px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "40px 24px",
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-xl)",
        border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 8px 40px rgba(16,185,129,0.12)",
        padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%",
      }}>
        <div className="payment-icon-success" style={{ fontSize: 64, marginBottom: 16, color: "var(--success)" }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--success)", marginBottom: 10, letterSpacing: "-0.3px" }}>
          Payment Successful!
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Your registration is confirmed and your ticket has been issued. You can view your QR code in My Tickets.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/my-tickets" className="btn btn-primary btn-lg">
            View My Tickets →
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
};

export default PaymentSuccess;
