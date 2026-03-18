import { Link } from "react-router-dom";

const Footer = () => (
  <footer style={{
    background: "#1e1b4b",
    color: "#c7d2fe",
    padding: "20px",
  }}>
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>EventEase</span>
        <span style={{ opacity: 0.4, fontSize: 12 }}>|</span>
        {[["Events", "/events"], ["Login", "/login"], ["Register", "/register"]].map(([label, to]) => (
          <Link key={to} to={to} style={{ color: "#c7d2fe", fontSize: 13, textDecoration: "none", opacity: 0.8 }}>{label}</Link>
        ))}
      </div>
      <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>© {new Date().getFullYear()} EventEase · support@eventease.com</p>
    </div>
  </footer>
);

export default Footer;
