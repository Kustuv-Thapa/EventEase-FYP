import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Footer = () => {
  const { user, isAuthenticated } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: "#0f172a", borderTop: "1px solid #1e293b", color: "#94a3b8", marginTop: "auto" }}>

      {/* Main grid */}
      <div className="footer-grid" style={{
        maxWidth: 1100, margin: "0 auto", padding: "32px 24px 20px",
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32,
      }}>

        {/* Brand */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <span style={{ color: "#6366f1", fontSize: 13 }}>✦</span>
            <span style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 17, letterSpacing: "-0.4px" }}>EventEase</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: "#64748b", maxWidth: 260, margin: "0 0 14px" }}>
            Discover, create, and manage events seamlessly — from intimate gatherings to large-scale conferences.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="mailto:support@eventease.com" style={{
              fontSize: 11, fontWeight: 600, color: "#64748b",
              background: "#1e293b", border: "1px solid #334155",
              borderRadius: 999, padding: "3px 10px", textDecoration: "none",
            }}>📧 Support</a>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#64748b",
              background: "#1e293b", border: "1px solid #334155",
              borderRadius: 999, padding: "3px 10px",
            }}>🌐 Nepal</span>
          </div>
        </div>

        {/* Explore */}
        <div>
          <h4 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Explore
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Browse Events", to: "/events" },
              { label: "Home", to: "/" },
            ].map(({ label, to }) => (
              <Link key={label} to={to} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = "#e2e8f0"}
                onMouseLeave={e => e.target.style.color = "#64748b"}
              >{label}</Link>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <h4 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Account
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!isAuthenticated ? (
              [
                { label: "Sign In", to: "/login" },
                { label: "Register", to: "/register" },
                { label: "Forgot Password", to: "/forgot-password" },
              ].map(({ label, to }) => (
                <Link key={label} to={to} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = "#e2e8f0"}
                  onMouseLeave={e => e.target.style.color = "#64748b"}
                >{label}</Link>
              ))
            ) : (
              [
                { label: "My Profile", to: "/profile" },
                ...(user?.role !== "ADMIN" ? [
                  { label: "My Registrations", to: "/my-registrations" },
                  { label: "My Tickets", to: "/my-tickets" },
                ] : []),
                ...(user?.role === "ORGANIZER" ? [
                  { label: "My Events", to: "/organizer/events" },
                  { label: "Analytics", to: "/organizer/analytics" },
                ] : []),
                ...(user?.role === "ADMIN" ? [
                  { label: "Admin Dashboard", to: "/admin/dashboard" },
                ] : []),
              ].map(({ label, to }) => (
                <Link key={label} to={to} style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = "#e2e8f0"}
                  onMouseLeave={e => e.target.style.color = "#64748b"}
                >{label}</Link>
              ))
            )}
          </div>
        </div>

        {/* Features */}
        <div>
          <h4 style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Features
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              "QR Ticket Verification",
              "Khalti Payments",
              "Real-time Analytics",
              "Email Notifications",
              "Venue Booking",
            ].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span style={{ color: "#6366f1", fontSize: 9 }}>✦</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: "1px solid #1e293b", padding: "12px 24px",
        maxWidth: 1100, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
          © {year} EventEase · Final Year Project
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {[
            { label: "Events", to: "/events" },
            { label: "Login", to: "/login" },
          ].map(({ label, to }) => (
            <Link key={label} to={to} style={{ fontSize: 11, color: "#475569", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = "#94a3b8"}
              onMouseLeave={e => e.target.style.color = "#475569"}
            >{label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
