import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyKhaltiPaymentApi } from "../api/khaltiApi";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [verifyStatus, setVerifyStatus] = useState("verifying");

  useEffect(() => {
    const pidx = searchParams.get("pidx");
    const khaltiStatus = searchParams.get("status");

    if (!pidx) {
      setVerifyStatus("success");
      return;
    }

    if (khaltiStatus === "User canceled" || khaltiStatus === "Failed") {
      setVerifyStatus("failed");
      return;
    }

    verifyKhaltiPaymentApi(pidx)
      .then(() => setVerifyStatus("success"))
      .catch((err) => {
        const httpStatus = err?.response?.status;
        // 401: session expired after Khalti redirect — can't verify, show session_expired
        // 404: payment record not found — genuine failure, do NOT treat as success
        if (httpStatus === 401) {
          setVerifyStatus("session_expired");
        } else {
          setVerifyStatus("failed");
        }
      });
  }, [searchParams]);

  if (verifyStatus === "verifying") {
    return (
      <div style={{ minHeight: "calc(100vh - 62px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (verifyStatus === "session_expired") {
    return (
      <div style={{ minHeight: "calc(100vh - 62px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "40px 24px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid rgba(234,179,8,0.3)", boxShadow: "0 8px 40px rgba(234,179,8,0.10)", padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>Session Expired</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Your session expired during payment. Please log in and check My Registrations — if payment was successful your ticket will be there.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">Log In →</Link>
        </div>
      </div>
    );
  }

  if (verifyStatus === "failed") {
    return (
      <div style={{ minHeight: "calc(100vh - 62px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "40px 24px" }}>
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 8px 40px rgba(239,68,68,0.10)", padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 10 }}>Verification Failed</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            Payment could not be verified. Please check My Registrations and try again.
          </p>
          <Link to="/my-registrations" style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-dark))", color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none" }}>
            My Registrations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 62px)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "40px 24px" }}>
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 8px 40px rgba(16,185,129,0.12)", padding: "48px 40px", textAlign: "center", maxWidth: 480, width: "100%" }}>
        <div style={{ fontSize: 64, marginBottom: 16, color: "var(--success)" }}>🎉</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--success)", marginBottom: 10, letterSpacing: "-0.3px" }}>Payment Successful!</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Your registration is confirmed and your ticket has been issued. You can view your QR code in My Tickets.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/my-tickets" className="btn btn-primary btn-lg">View My Tickets →</Link>
          <Link to="/events" style={{ background: "var(--surface)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, padding: "11px 24px", borderRadius: "var(--radius-sm)", textDecoration: "none", border: "1.5px solid var(--border)" }}>
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
